import { describe, expect, it } from 'vitest';
import { mergeEntries, parseFinanceFile, possibleDuplicates } from './financeImportService';
import type { FinanceEntry } from './financeImportService';
const one: FinanceEntry = {id:'a',provider:'wechat',sourceName:'微信支付',title:'支付成功',amountCents:1590,currency:'CNY',direction:'expense',status:'succeeded',date:'2026-10-07',occurredAt:null,receivedAt:'2026-10-07T12:00:00+08:00',merchant:'商户',category:'其他',reviewReasons:[],identityKeys:['message:a'],sources:[{message:'a'}]};
describe('财务导入', () => {
  it('拒绝非法金额和没有来源身份的流水', () => {
    expect(() => parseFinanceFile(JSON.stringify({format:'dating-finance/v1',entries:[{...one,amountCents:1.5}]}))).toThrow();
    expect(() => parseFinanceFile(JSON.stringify({format:'dating-finance/v1',entries:[{...one,identityKeys:[]}]}))).toThrow();
    expect(() => parseFinanceFile(JSON.stringify({format:'dating-finance/v1',entries:[{...one,date:'2026-02-31'}]}))).toThrow();
    expect(() => parseFinanceFile(JSON.stringify({format:'dating-finance/v1',entries:[{...one,sources:[]}]}))).toThrow();
  });
  it('相同金额只提示，人工合并保留两个来源身份', () => {
    const two = {...one,id:'b',provider:'citic',identityKeys:['message:b'],sources:[{message:'b'}]};
    expect(possibleDuplicates(one,[one,two])).toEqual([two]);
    expect(mergeEntries([one,two]).identityKeys).toEqual(['message:a','message:b']);
    expect(mergeEntries([one,two]).sources).toHaveLength(2);
    expect(() => mergeEntries([one,{...two,amountCents:2000}])).toThrow();
  });
  it('重复消息身份拒绝整包，不静默覆盖', () => {
    expect(() => parseFinanceFile(JSON.stringify({format:'dating-finance/v1',entries:[one,one]}))).toThrow();
  });
  it('订单列表单独不能当作扣款；合并真实扣款后保留两份证据', () => {
    const order = {...one,id:'order',provider:'jd',evidenceOnly:true,identityKeys:['order:jd:a:o']};
    expect(mergeEntries([order,{...order,id:'order2'}]).evidenceOnly).toBe(true);
    expect(mergeEntries([order,one]).evidenceOnly).toBe(false);
    expect(mergeEntries([order,one]).identityKeys).toContain('order:jd:a:o');
  });
});
