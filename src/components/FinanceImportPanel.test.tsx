import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinanceImportPanel } from './FinanceImportPanel';
import { bookFinance, fetchFinanceHistory } from '../services/financeImportService';
vi.mock('../services/financeImportService', async importOriginal => ({
  ...await importOriginal<typeof import('../services/financeImportService')>(),
  fetchFinanceHistory: vi.fn(async () => ({postings:[],keys:[]})),
  bookFinance: vi.fn(async () => ({added:1,duplicates:0}))
}));
const base = {id:'synthetic',provider:'wechat',sourceName:'测试通知',title:'测试付款',amountCents:1000,currency:'CNY',direction:'expense',status:'succeeded',date:'2000-01-01',occurredAt:'2000-01-01T10:00:00+08:00',receivedAt:'2000-01-01T10:00:01+08:00',merchant:'合成商户',category:'其他',reviewReasons:[],identityKeys:['synthetic:key'],sources:[{name:'合成来源'}]};
afterEach(()=>{cleanup();vi.clearAllMocks();});
async function load(entry=base, expected:RegExp=/已读取 1 条/) {
  const user=userEvent.setup();
  const view=render(<FinanceImportPanel data={{budgets:[],dayRecords:[],extraExpenses:[],settings:null}} onImported={vi.fn(async()=>{})} />);
  const input=view.container.querySelector('input[type=file]') as HTMLInputElement;
  const text=JSON.stringify({format:'dating-finance/v1',entries:[entry]});
  const file=new File([text],'synthetic.json',{type:'application/json'});
  Object.defineProperty(file,'text',{value:async()=>text});
  await user.upload(input,file);
  await screen.findByText(expected);
  return user;
}
describe('财务预览入账',()=>{
  it('默认不选择，核对类别后仅提交所选记录',async()=>{
    const user=await load();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(bookFinance).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));
    await user.selectOptions(screen.getByLabelText('入账方式'),'extra:交通');
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText('入账 1 条，已有流水 0 条。');
    expect(bookFinance).toHaveBeenCalledWith([expect.objectContaining({id:'synthetic',category:'交通',target:'extra'})]);
  });
  it('订单列表不给新增支出的选项',async()=>{
    await load({...base,evidenceOnly:true} as typeof base);
    expect(screen.queryByRole('option',{name:'计入午餐'})).not.toBeInTheDocument();
    expect(screen.queryByRole('option',{name:'额外支出：其他'})).not.toBeInTheDocument();
  });
  it('未取得已有来源时不允许入账',async()=>{
    vi.mocked(fetchFinanceHistory).mockRejectedValueOnce(new Error('连接失败')).mockRejectedValueOnce(new Error('连接失败'));
    await load(base,/^连接失败$/);
    expect(bookFinance).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:/核对完成/})).toBeDisabled();
  });
});
