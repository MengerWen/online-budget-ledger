-- Only the local Dating connector holds the capability; no service-role key is used.
create schema if not exists finance_bridge;
revoke all on schema finance_bridge from public;
create table if not exists finance_bridge.connectors (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table finance_bridge.connectors enable row level security;
revoke all on finance_bridge.connectors from public,anon,authenticated;

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
  select coalesce(jsonb_agg(jsonb_build_object('canonicalId',canonical_id,'postingId',id,'date',date,'amountCents',amount_cents,'target',target)),'[]'::jsonb)
    into receipts from public.finance_postings where user_id=owner_id
    and canonical_id in (select jsonb_array_elements_text(p_ids));
  perform set_config('request.jwt.claim.sub',coalesce(original_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(original_claims,''),true);
  return result||jsonb_build_object('postings',receipts);
end; $$;
revoke all on function finance_bridge.sync_confirmed(text,jsonb,jsonb) from public;
grant usage on schema finance_bridge to anon,authenticated;
grant execute on function finance_bridge.sync_confirmed(text,jsonb,jsonb) to anon,authenticated;

create or replace function public.sync_confirmed_finance(p_token text,p_entries jsonb,p_ids jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select finance_bridge.sync_confirmed(p_token,p_entries,p_ids);
$$;
revoke all on function public.sync_confirmed_finance(text,jsonb,jsonb) from public;
grant execute on function public.sync_confirmed_finance(text,jsonb,jsonb) to anon,authenticated;
