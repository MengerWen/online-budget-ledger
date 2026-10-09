-- 通过管理连接执行。所有金额及日期均为合成测试，事务最终回滚。
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by created_at limit 1),true);
set local role authenticated;
do $$
declare
  owner_id uuid := auth.uid(); entry jsonb; result jsonb; original_id uuid;
  before_meal numeric; after_meal numeric; manual_id uuid; rejected boolean;
begin
  assert owner_id is not null, '测试需已有登录用户';
  entry := jsonb_build_object('id','__finance_test_expense__','date','2000-01-01','amountCents',1000,'currency','CNY','status','succeeded','direction','expense','target','extra','category','其他','sources',jsonb_build_array(jsonb_build_object('name','合成测试')),'identityKeys',jsonb_build_array('__finance_test_key__'));
  result := public.import_finance_batch(jsonb_build_array(entry));
  assert result->>'added'='1', '首次未入账';
  select id into original_id from public.finance_postings where canonical_id=entry->>'id';
  result := public.import_finance_batch(jsonb_build_array(entry));
  assert result->>'duplicates'='1', '重复未拦截';
  assert (select count(*) from public.extra_expenses where finance_posting_id=original_id)=1, '重复增加金额';
  result := public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_alias__','linkTo',original_id,'identityKeys',jsonb_build_array('__finance_test_alias_key__'),'sources',jsonb_build_array(jsonb_build_object('name','另一个来源')))));
  assert result->>'duplicates'='1', '关联又入账';
  assert (select payload->'sources'->0->>'name' from public.finance_keys where identity_key='__finance_test_alias_key__')='另一个来源', '关联丢失来源';

  select coalesce(lunch,0) into before_meal from public.day_records where date='2000-01-02';
  before_meal:=coalesce(before_meal,0);
  result := public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_meal__','date','2000-01-02','target','lunch','identityKeys',jsonb_build_array('__finance_test_meal_key__'))));
  select lunch into after_meal from public.day_records where date='2000-01-02';
  assert after_meal=before_meal+10, '餐费未按增量增加';

  insert into public.extra_expenses(user_id,date,amount,category,note) values(owner_id,'2000-01-03',10,'其他','合成测试') returning id into manual_id;
  result := public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_manual__','date','2000-01-03','target','existing','existingExpenseId',manual_id,'identityKeys',jsonb_build_array('__finance_test_manual_key__'))));
  assert result->>'added'='1', '手工记录未关联';
  assert not exists(select 1 from public.extra_expenses where finance_posting_id=(select id from public.finance_postings where canonical_id='__finance_test_manual__')), '手工记录被再次记账';

  result := public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_refund__','amountCents',300,'direction','refund','refundOf',original_id,'identityKeys',jsonb_build_array('__finance_test_refund_key__'))));
  assert (select sum(amount) from public.extra_expenses where finance_posting_id in (select id from public.finance_postings where id=original_id or refund_of=original_id))=7, '退款未冲减';
  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_overrefund__','amountCents',701,'direction','refund','refundOf',original_id,'identityKeys',jsonb_build_array('__finance_test_overrefund_key__'))));
  exception when others then rejected:=sqlerrm='累计退款超过原支出'; end;
  assert rejected, '超额退款未拒绝';

  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_atomic__','identityKeys',jsonb_build_array('__finance_test_atomic_key__')), (entry-'currency')||jsonb_build_object('id','__finance_test_invalid__','identityKeys',jsonb_build_array('__finance_test_invalid_key__'))));
  exception when others then rejected:=true; end;
  assert rejected and not exists(select 1 from public.finance_postings where canonical_id='__finance_test_atomic__'), '批次失败没有完整回滚';

  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_order__','evidenceOnly',true,'identityKeys',jsonb_build_array('__finance_test_order_key__'))));
  exception when others then rejected:=sqlerrm='订单列表只能补充已经记录的实际支出'; end;
  assert rejected, '订单列表被当作实际扣款';

  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_receipt__','paymentDateReviewRequired',true,'identityKeys',jsonb_build_array('__finance_test_receipt_key__'))));
  exception when others then rejected:=sqlerrm='请先核对实付款的实际扣款日期'; end;
  assert rejected, '实付详情未核对扣款日期仍可入账';
  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_receipt__','paymentDateReviewRequired',true,'paymentDateConfirmedFor','2000-01-02','identityKeys',jsonb_build_array('__finance_test_receipt_key__'))));
  exception when others then rejected:=sqlerrm='请先核对实付款的实际扣款日期'; end;
  assert rejected, '修改日期后仍接受旧确认';
  result := public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_receipt__','paymentDateReviewRequired',true,'paymentDateConfirmedFor','2000-01-01','identityKeys',jsonb_build_array('__finance_test_receipt_key__'))));
  assert result->>'added'='1', '确认扣款日期后未入账';
  assert (select payload->>'paymentDateConfirmedFor' from public.finance_postings where canonical_id='__finance_test_receipt__')='2000-01-01', '未保留日期核对记录';

  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  assert not exists(select 1 from public.finance_postings where id=original_id), 'RLS 未隔离其他用户';
  rejected:=false;
  begin
    perform public.import_finance_batch(jsonb_build_array(entry||jsonb_build_object('id','__finance_test_foreign__','linkTo',original_id)));
  exception when others then rejected:=sqlerrm='关联流水不存在'; end;
  assert rejected, '跨用户关联未拒绝';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
end $$;
rollback;
