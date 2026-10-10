import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinanceImportPanel } from './FinanceImportPanel';
import { bookFinance, fetchFinanceHistory } from '../services/financeImportService';
import { restoreLocalFinanceFeed } from '../services/localFinanceFeed';
vi.mock('../services/localFinanceFeed',()=>({connectLocalFinanceFeed:vi.fn(),restoreLocalFinanceFeed:vi.fn(async()=>undefined)}));
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
  it('连接文件自动恢复，入账前发现新证据时阻止提交旧内容',async()=>{
    let text=JSON.stringify({format:'dating-finance/v1',generatedAt:'2000-01-01T12:00:00+08:00',entries:[base]});
    const handle={getFile:vi.fn(async()=>({size:text.length,text:async()=>text}) as File),queryPermission:vi.fn(async()=>'granted')};
    vi.mocked(restoreLocalFinanceFeed).mockResolvedValueOnce(handle);
    const user=userEvent.setup();
    render(<FinanceImportPanel data={{budgets:[],dayRecords:[],extraExpenses:[],settings:null}} onImported={vi.fn(async()=>{})} />);
    await screen.findByText(/已自动读取 1 条/);
    expect(screen.getByText(/来源文件更新：2000-01-01T12:00:00/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));await user.selectOptions(screen.getByLabelText('入账方式'),'lunch');
    text=JSON.stringify({format:'dating-finance/v1',entries:[{...base,title:'更新后的支付证据'}]});
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText(/未完成入账：交易证据已更新/);
    expect(bookFinance).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
  it('同步文件读取失败时保留当前核对并停止入账',async()=>{
    const text=JSON.stringify({format:'dating-finance/v1',entries:[base]});
    const getFile=vi.fn(async()=>({size:text.length,text:async()=>text}) as File);
    vi.mocked(restoreLocalFinanceFeed).mockResolvedValueOnce({getFile,queryPermission:vi.fn(async()=>'granted')});
    const user=userEvent.setup();
    render(<FinanceImportPanel data={{budgets:[],dayRecords:[],extraExpenses:[],settings:null}} onImported={vi.fn(async()=>{})} />);
    await screen.findByText(/已自动读取 1 条/);
    await user.click(screen.getByRole('checkbox'));await user.selectOptions(screen.getByLabelText('入账方式'),'lunch');
    getFile.mockRejectedValueOnce(new Error('读取权限过期'));
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText('未完成入账：读取权限过期');expect(bookFinance).not.toHaveBeenCalled();
  });
  it('接收三餐分类并把详细备注提交到对应一餐',async()=>{
    const entry={...base,bookingNote:'商户：合成商户\n商品：米饭 / 鸡肉\n下单时间：2000-01-01 12:01:23',reviewedBooking:{category:'午餐',explanation:'和同学吃饭',date:base.date,dateConfirmed:true,disposition:'confirm'}};
    const user=await load(entry as typeof base);
    await user.click(screen.getByRole('button',{name:'采用已核对分类和日期'}));
    expect(screen.getByLabelText('入账方式')).toHaveValue('lunch');
    expect(screen.getByLabelText('入账备注')).toHaveValue(entry.bookingNote);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText('入账 1 条，已有流水 0 条。');
    expect(bookFinance).toHaveBeenCalledWith([expect.objectContaining({target:'lunch',bookingNote:entry.bookingNote})]);
  });
  it('显示 AI 建议和人工分类，采用后仍需勾选入账',async()=>{
    const user=await load({...base,aiSuggestion:{category:'餐饮',confidence:'medium',reason:'餐厅消费',question:'核对用途',evidenceIds:['synthetic']},reviewedBooking:{category:'交通',explanation:'已核对为车费',date:'2000-01-02',dateConfirmed:true,disposition:'confirm'}} as typeof base);
    expect(screen.getByText(/AI 建议：餐饮/)).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'采用已核对分类和日期'}));
    expect(screen.getByLabelText('入账方式')).toHaveValue('extra:交通');
    expect(screen.getByLabelText('记账日期')).toHaveValue('2000-01-02');
    expect(bookFinance).not.toHaveBeenCalled();expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
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
  it('实付详情必须核对扣款日期，改日期后需重新确认',async()=>{
    const user=await load({...base,occurredAt:null,paymentDateReviewRequired:true} as unknown as typeof base);
    const choices=screen.getAllByRole('checkbox');
    await user.click(choices[0]);
    await user.selectOptions(screen.getByLabelText('入账方式'),'lunch');
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText(/请核对实付款的实际扣款日期/);
    expect(bookFinance).not.toHaveBeenCalled();
    await user.click(choices[1]);
    const date=screen.getByLabelText('记账日期');
    await user.clear(date);await user.type(date,'2000-01-02');
    expect(choices[1]).not.toBeChecked();
    await user.click(choices[1]);
    await user.click(screen.getByRole('button',{name:'核对完成，入账 1 条'}));
    await screen.findByText('入账 1 条，已有流水 0 条。');
    expect(bookFinance).toHaveBeenCalledWith([expect.objectContaining({date:'2000-01-02',paymentDateConfirmedFor:'2000-01-02',occurredAt:null,target:'lunch'})]);
  });
  it('未取得已有来源时不允许入账',async()=>{
    vi.mocked(fetchFinanceHistory).mockRejectedValueOnce(new Error('连接失败')).mockRejectedValueOnce(new Error('连接失败'));
    await load(base,/^连接失败$/);
    expect(bookFinance).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:/核对完成/})).toBeDisabled();
  });
});
