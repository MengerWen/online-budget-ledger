create or replace function public.import_finance_batch(p_entries jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  uid uuid := auth.uid(); e jsonb; k text; keys text[]; ids uuid[];
  cents bigint; booked_date date; dir text; target_name text; category_name text;
  post public.finance_postings%rowtype; original public.finance_postings%rowtype;
  pid uuid; refund_id uuid; existing_id uuid; total_refund bigint;
  added integer:=0; duplicates integer:=0; value numeric; existing_date date;
begin
  if uid is null then raise exception '请先登录'; end if;
  if coalesce(jsonb_typeof(p_entries),'')<>'array' or jsonb_array_length(p_entries) not between 1 and 500 then raise exception '每次入账 1 至 500 条'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 731));
  for e in select * from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(e)<>'object' or coalesce(jsonb_typeof(e->'amountCents'),'')<>'number' or (e->>'amountCents')!~'^[0-9]+$' or coalesce(jsonb_typeof(e->'id'),'')<>'string' or length(coalesce(e->>'id','')) not between 1 and 256 or coalesce(e->>'date','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception '流水身份、日期或金额无效'; end if;
    cents:=(e->>'amountCents')::bigint; booked_date:=(e->>'date')::date;
    dir:=e->>'direction'; target_name:=e->>'target'; category_name:=coalesce(nullif(e->>'category',''),'其他');
    if cents<=0 or cents>1000000000000 or coalesce(e->>'currency','')<>'CNY' or coalesce(e->>'status','')<>'succeeded' or coalesce(dir,'') not in ('expense','refund') or coalesce(target_name,'') not in ('extra','breakfast','lunch','dinner','existing') then raise exception '请选择成功状态明确的人民币支出或退款'; end if;
    if coalesce(jsonb_typeof(e->'sources'),'')<>'array' or jsonb_array_length(e->'sources')=0 or coalesce(jsonb_typeof(e->'identityKeys'),'')<>'array' or jsonb_array_length(e->'identityKeys') not between 1 and 100 then raise exception '流水必须保留来源及身份'; end if;
    if exists(select 1 from jsonb_array_elements(e->'sources') item where jsonb_typeof(item)<>'object') or exists(select 1 from jsonb_array_elements(e->'identityKeys') item where jsonb_typeof(item)<>'string') then raise exception '来源及身份格式无效'; end if;
    select array_agg(distinct item) into keys from jsonb_array_elements_text(e->'identityKeys') item;
    if exists(select 1 from unnest(keys) item where length(item) not between 1 and 500) then raise exception '来源身份长度无效'; end if;
    select array_agg(distinct id) into ids from (
      select posting_id id from public.finance_keys where user_id=uid and identity_key=any(keys)
      union select id from public.finance_postings where user_id=uid and canonical_id=e->>'id'
    ) known;
    if e->>'linkTo' is not null then
      select * into post from public.finance_postings where user_id=uid and id=(e->>'linkTo')::uuid;
      if not found then raise exception '关联流水不存在'; end if;
      if array_length(ids,1)>0 and not post.id=any(ids) then raise exception '来源已属于另一笔流水'; end if;
      ids:=array[post.id];
    end if;
    if array_length(ids,1)>1 then raise exception '这些来源已分别入账，请先核对重复支出'; end if;
    if array_length(ids,1)=1 then
      select * into post from public.finance_postings where user_id=uid and id=ids[1];
      if post.amount_cents<>cents or post.date<>booked_date or post.direction<>dir then raise exception '已有流水的金额、日期或方向与新来源不一致，请先核对来源修正'; end if;
      foreach k in array keys loop
        insert into public.finance_keys values(uid,k,post.id,e) on conflict do nothing;
      end loop;
      duplicates:=duplicates+1; continue;
    end if;
    if e->>'evidenceOnly'='true' and target_name<>'existing' then raise exception '订单列表只能补充已经记录的实际支出'; end if;
    refund_id:=null;
    if dir='refund' then
      if target_name<>'extra' or e->>'refundOf' is null then raise exception '退款需选择原支出，以额外支出冲减'; end if;
      refund_id:=(e->>'refundOf')::uuid;
      select * into original from public.finance_postings where user_id=uid and id=refund_id;
      if not found or original.direction<>'expense' then raise exception '原支出不存在'; end if;
      select coalesce(sum(amount_cents),0) into total_refund from public.finance_postings where user_id=uid and refund_of=refund_id;
      if total_refund+cents>original.amount_cents then raise exception '累计退款超过原支出'; end if;
      category_name:=original.category;
    end if;
    if target_name='existing' then
      if dir<>'expense' or e->>'existingExpenseId' is null then raise exception '请选择已经手工记录的支出'; end if;
      existing_id:=(e->>'existingExpenseId')::uuid;
      select amount,date into value,existing_date from public.extra_expenses where user_id=uid and id=existing_id;
      if not found or round(value*100)<>cents or existing_date<>booked_date then raise exception '手工记录的金额或日期不匹配'; end if;
      if exists(select 1 from public.finance_postings where user_id=uid and payload->>'existingExpenseId'=existing_id::text) then raise exception '这条手工记录已经关联另一笔来源，请关联已有流水'; end if;
    end if;
    insert into public.finance_postings(user_id,canonical_id,date,amount_cents,direction,target,category,payload,refund_of)
      values(uid,e->>'id',booked_date,cents,dir,target_name,category_name,e,refund_id) returning id into pid;
    foreach k in array keys loop insert into public.finance_keys values(uid,k,pid,e); end loop;
    if target_name='extra' then
      insert into public.extra_expenses(user_id,date,amount,category,note,finance_posting_id)
        values(uid,booked_date,(case when dir='refund' then -cents else cents end)::numeric/100,category_name,left(coalesce(e->>'merchant','')||' '||coalesce(e->>'title',''),2000),pid);
    elsif target_name in ('breakfast','lunch','dinner') then
      insert into public.day_records(user_id,date) values(uid,booked_date) on conflict(user_id,date) do nothing;
      perform 1 from public.day_records where user_id=uid and date=booked_date for update;
      update public.day_records set
        breakfast=case when target_name='breakfast' then coalesce(breakfast,0)+cents::numeric/100 else breakfast end,
        lunch=case when target_name='lunch' then coalesce(lunch,0)+cents::numeric/100 else lunch end,
        dinner=case when target_name='dinner' then coalesce(dinner,0)+cents::numeric/100 else dinner end,
        updated_at=now() where user_id=uid and date=booked_date;
    end if;
    added:=added+1;
  end loop;
  return jsonb_build_object('added',added,'duplicates',duplicates);
end; $$;
revoke execute on function public.import_finance_batch(jsonb) from public,anon;
grant execute on function public.import_finance_batch(jsonb) to authenticated;
