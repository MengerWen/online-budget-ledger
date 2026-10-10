-- 在事务内用合成流水验证三餐备注；最后回滚，不留下记账记录。
begin;
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception '验收需要已有测试账号'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
end; $$;
set local role authenticated;
do $$
declare meal text; e jsonb; result jsonb; notes text; count_before integer;
begin
  if exists(select 1 from public.day_records where user_id=auth.uid() and date='2199-10-10') then
    raise exception '合成验收日期已有记录，请更换日期';
  end if;
  select count(*) into count_before from public.finance_postings where user_id=auth.uid();
  insert into public.day_records(user_id,date,breakfast_note,lunch_note,dinner_note)
    values(auth.uid(),'2199-10-10','原早餐备注','原午餐备注','原晚餐备注');
  foreach meal in array array['breakfast','lunch','dinner'] loop
    e:=jsonb_build_object('id','synthetic-meal-notes-'||meal,'date','2199-10-10',
      'amountCents',1234,'currency','CNY','direction','expense','status','succeeded',
      'target',meal,'category','餐饮','identityKeys',jsonb_build_array('synthetic-meal-notes:'||meal),
      'sources',jsonb_build_array(jsonb_build_object('name','合成测试')),
      'bookingNote',E'商户：测试餐厅\n商品：米饭 / 鸡肉\n下单时间：2199-10-10 12:01:23');
    result:=public.import_finance_batch(jsonb_build_array(e));
    if result->>'added'<>'1' then raise exception '首笔未成功入账'; end if;
    result:=public.import_finance_batch(jsonb_build_array(e));
    if result->>'duplicates'<>'1' or result->>'added'<>'0' then raise exception '重复流水未去重'; end if;
  end loop;
  if not exists(select 1 from public.day_records where user_id=auth.uid() and date='2199-10-10'
    and breakfast=12.34 and lunch=12.34 and dinner=12.34
    and breakfast_note like E'原早餐备注\n商户：测试餐厅%'
    and lunch_note like E'原午餐备注\n商户：测试餐厅%'
    and dinner_note like E'原晚餐备注\n商户：测试餐厅%') then raise exception '三餐金额或原备注未保留'; end if;
  e:=e||jsonb_build_object('id','synthetic-second-dinner','identityKeys',jsonb_build_array('synthetic-second-dinner'), 'bookingNote','第二笔晚餐');
  perform public.import_finance_batch(jsonb_build_array(e));
  select dinner_note into notes from public.day_records where user_id=auth.uid() and date='2199-10-10';
  if notes not like E'%\n第二笔晚餐' then raise exception '同一餐的第二笔备注未追加'; end if;
  if (select count(*) from public.finance_postings where user_id=auth.uid())<>count_before+4 then raise exception '重复通知产生了多余流水'; end if;
end; $$;
select '三餐备注、手写备注保留、同餐追加和重复去重全部通过；事务回滚' as result;
rollback;
