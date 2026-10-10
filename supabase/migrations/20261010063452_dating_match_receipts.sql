create or replace function finance_bridge.sync_confirmed(p_token text,p_entries jsonb,p_ids jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid; e jsonb; review jsonb; category_name text; target_name text;
  result jsonb := '{"added":0,"duplicates":0}'::jsonb; receipts jsonb;
  original_sub text := current_setting('request.jwt.claim.sub',true);
  original_claims text := current_setting('request.jwt.claims',true);
begin
  if length(coalesce(p_token,'')) not between 40 and 200 then raise exception '记账连接无效'; end if;
  select user_id into owner_id from finance_bridge.connectors
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and enabled;
  if owner_id is null then raise exception '记账连接无效'; end if;
  if auth.uid() is not null and auth.uid()<>owner_id then raise exception '记账账号不匹配'; end if;
  if coalesce(jsonb_typeof(p_entries),'')<>'array' or jsonb_array_length(p_entries)>100
    or coalesce(jsonb_typeof(p_ids),'')<>'array' or jsonb_array_length(p_ids)>500
    or exists(select 1 from jsonb_array_elements(p_ids) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 256)
    then raise exception '同步内容无效'; end if;
  for e in select * from jsonb_array_elements(p_entries) loop
    review:=e->'reviewedBooking'; category_name:=review->>'category';
    target_name:=case category_name when '早餐' then 'breakfast' when '午餐' then 'lunch' when '晚餐' then 'dinner' else 'extra' end;
    if coalesce(jsonb_typeof(review),'')<>'object' or coalesce(review->>'disposition','')<>'confirm'
      or coalesce(review->>'confirmedAt','')='' or coalesce(review->>'signature','')!~'^[0-9a-f]{64}$'
      or coalesce(review->>'date','')<>coalesce(e->>'date','')
      or coalesce(category_name,'') not in ('早餐','午餐','晚餐','餐饮','交通','日用品','学习成长','数码订阅','娱乐社交','服饰美容','健康医疗','人情礼物','旅行住宿','其他')
      or coalesce(e->>'target','')<>target_name or coalesce(e->>'category','')<>category_name
      or coalesce(e->>'direction','')<>'expense' or e->>'evidenceOnly'='true'
      or (e->>'paymentDateReviewRequired'='true' and (review->>'dateConfirmed'<>'true' or e->>'paymentDateConfirmedFor'<>e->>'date'))
      then raise exception '只同步本人明确确认的已付款支出；退款和收入仍需单独核对'; end if;
  end loop;
  -- import_finance_batch scopes every posting/key/day record to auth.uid().
  -- The capability fixes that identity; caller supplied user IDs are never used.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  if jsonb_array_length(p_entries)>0 then result:=public.import_finance_batch(p_entries); end if;
  select coalesce(jsonb_agg(jsonb_build_object('canonicalId',requested.id,'storedCanonicalId',p.canonical_id,'postingId',p.id,'date',p.date,'amountCents',p.amount_cents,'target',p.target)),'[]'::jsonb)
    into receipts from jsonb_array_elements_text(p_ids) requested(id)
    join public.finance_postings p on p.user_id=owner_id and (
      p.canonical_id=requested.id or exists (
        select 1 from jsonb_array_elements(p_entries) incoming
        join public.finance_keys k on k.user_id=owner_id and k.posting_id=p.id
        where incoming->>'id'=requested.id and (incoming->'identityKeys') ? k.identity_key
      )
    );
  perform set_config('request.jwt.claim.sub',coalesce(original_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(original_claims,''),true);
  return result||jsonb_build_object('postings',receipts);
end; $$;
