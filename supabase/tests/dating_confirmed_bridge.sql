begin;
insert into finance_bridge.connectors(token_hash,user_id)
select encode(extensions.digest(repeat('test-dating-bridge-',4),'sha256'),'hex'),id from auth.users limit 1;
set local role anon;
do $$
declare e jsonb; result jsonb;
begin
  begin
    perform public.sync_confirmed_finance(repeat('invalid',10),'[]','[]');
    raise exception 'invalid token unexpectedly accepted';
  exception when others then if sqlerrm<>'记账连接无效' then raise; end if; end;
  e:=jsonb_build_object('id','test-confirmed-bridge-lunch','amountCents',6000,'currency','CNY','status','succeeded','date','2199-10-10','direction','expense','target','lunch','category','午餐','bookingNote','test meal note','identityKeys',jsonb_build_array('test:confirmed:bridge:lunch'),'sources',jsonb_build_array(jsonb_build_object('name','test')),'reviewedBooking',jsonb_build_object('category','午餐','date','2199-10-10','dateConfirmed',true,'disposition','confirm','confirmedAt','2199-10-10T12:00:00+08:00','signature',repeat('0',64)));
  begin
    perform public.sync_confirmed_finance(repeat('test-dating-bridge-',4),jsonb_build_array(e-'reviewedBooking'),'[]');
    raise exception 'unreviewed posting unexpectedly accepted';
  exception when others then if sqlerrm not like '只同步本人明确确认%' then raise; end if; end;
  result:=public.sync_confirmed_finance(repeat('test-dating-bridge-',4),jsonb_build_array(e),jsonb_build_array(e->>'id'));
  if result->>'added'<>'1' or result#>>'{postings,0,amountCents}'<>'6000' then raise exception 'receipt missing'; end if;
  result:=public.sync_confirmed_finance(repeat('test-dating-bridge-',4),jsonb_build_array(e),jsonb_build_array(e->>'id'));
  if result->>'duplicates'<>'1' or result->>'added'<>'0' then raise exception 'duplicate posting'; end if;
end $$;
reset role;
do $$ begin
  if (select lunch from public.day_records where date='2199-10-10' and user_id=(select id from auth.users limit 1))<>60 then raise exception 'lunch amount mismatch'; end if;
  if exists(select 1 from public.finance_postings where canonical_id='test-confirmed-bridge-lunch' and payload->>'bookingNote'<>'test meal note') then raise exception 'note mismatch'; end if;
end $$;
rollback;
