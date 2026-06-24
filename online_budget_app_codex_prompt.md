# Codex 开发任务：在线版生活费预算记账 Web App

> 目标：开发一个可以真正部署到公网、支持手机 / 电脑 / iPad 随时随地访问的个人生活费预算记账网页 App。  
> 推荐技术路线：React + TypeScript + Vite + Supabase + Vercel + PWA。  
> 核心原则：数据不能只存在本机浏览器里，必须有云端数据库与用户账号，确保跨设备登录后能看到同一套记账数据。

---

## 0. 任务背景

我要开发一个「生活费预算 + 每日三餐 + 额外支出」的个人记账网页 App。

我每月会设定几档生活费 budget，例如：

```text
2000 / 3000 / 4000
```

每天我需要记录：

```text
早餐花销
午餐花销
晚餐花销
额外花销
```

App 要自动计算：

```text
在每一档 budget 下：
1. 每天理论允许花销是多少
2. 每顿饭理论允许花销是多少
3. 这顿饭相对于 budget 节约/超支多少
4. 今天总花销相对于今日 budget 节约/超支多少
5. 本月至今相对于 budget 节约/超支多少
6. 本月还剩多少钱
7. 从今天开始到月底，剩余每天/每顿还可以花多少钱
```

这个 App 的重点不是企业财务系统，而是让我每天一眼看到：

```text
今天有没有超？
这个月有没有超？
不同 budget 下我现在还剩多少？
之后每天还能怎么花？
```

---

## 1. 总体产品要求

### 1.1 必须是在线版

这个 App 不能只是本地网页，不能只靠 localStorage / IndexedDB 存数据。

必须做到：

```text
1. 部署到公网 URL
2. 手机 / 电脑 / iPad 都能访问
3. 用户登录后，跨设备看到同一套数据
4. 数据保存在云端数据库
5. 本地缓存只能作为辅助，不是唯一数据源
```

### 1.2 推荐架构

优先采用：

```text
前端：React + TypeScript + Vite
部署：Vercel
后端 / 数据库 / 登录：Supabase
数据库：Postgres
权限：Supabase Auth + Row Level Security
PWA：支持添加到主屏幕，移动端像 App 一样打开
样式：Tailwind CSS 或 CSS Modules
状态管理：React hooks/context；不要引入过重框架
```

如果当前仓库已有技术栈，请先检查仓库结构，并尽量沿用现有技术栈；如果是空仓库，再创建上述技术栈。

### 1.3 线上访问与跨设备同步

请实现：

```text
1. Supabase 邮箱登录 / magic link / password login，至少实现一种稳定方案
2. 每个用户只能看到自己的 budgets / dayRecords / extraExpenses / settings
3. 所有数据表都必须带 user_id
4. Supabase RLS 必须开启
5. 前端使用当前登录用户的 session 读写数据
6. 未登录时显示登录页
7. 登录后进入记账主界面
8. 退出登录功能
```

### 1.4 PWA 要求

请让网页具备 PWA 能力：

```text
1. 有 manifest
2. 有 app name / icon / theme color
3. 可添加到手机主屏幕
4. 基础静态资源可缓存
5. 网络断开时显示友好提示
6. 如果实现离线记录，必须设计同步队列；如果不实现离线写入，要明确提示“离线状态下不能保存”
```

本阶段可以先实现「在线优先」：

```text
在线时正常使用
离线时允许查看最近缓存，但保存按钮提示需要联网
```

不要为了离线而牺牲数据一致性。

### 1.5 多档预算并行计算与展示原则（核心）

本 App 最核心的交互是“多档预算同时对照”，而非“选中一个预算来记账”。

因此，必须遵守以下铁律：
1. 所有计算函数（calculateBudgetStatus / calculateMealDiff 等）的输入参数必须是 BudgetPlan[]（数组），输出结果必须是 Map<budgetId, CalculationResult> 或按 budgetId 索引的对象。
2. 前端 UI 中，凡是展示“理论额度”、“节约/超支”、“剩余余额”的地方，必须使用数组循环（.map(budget => ...)）同时渲染所有档位的结果。
3. 禁止在任何汇总区域只展示“默认 budget”的计算结果；默认 budget 仅用于：①
	1. 月历格子的背景色/标记简略着色（因格子空间有限）；
	2. 新用户首次打开时的默认选中态。
4. 当用户新增或删除一个 budget 时，所有页面的计算结果必须同步实时更新，无需刷新页面。
5. UI 中多档对比的展示方式，统一采用“横向卡片并列”或“纵向列表展开”，确保用户一眼能对比出“如果选 2000 会怎样，如果选 4000 会怎样”。

---

## 2. 不需要的功能

明确不要实现：

```text
1. 快速填入金额按钮
2. +10 / +15 / +20 / +30 这类快捷金额按钮
3. 一键填入早餐/午餐/晚餐金额
```

额外花销的类别可以有下拉选项，但不要做“快捷金额填入”。

---

## 3. 核心功能一：Budget 管理

用户可以新增、删除、编辑多档「生活费 budget」。

每个 budget 至少包含：

```ts
type BudgetPlan = {
  id: string;
  user_id: string;
  name: string;          // 例如 "紧缩 2000", "正常 3000", "宽松 4000"
  monthlyAmount: number; // 例如 2000 / 3000 / 4000
  currency: "CNY";
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};
```

要求：

1. 所有设定过的 budget 都要显示出来。
2. 支持添加多个 budget。
3. 支持删除 budget，但删除前要确认。
4. 支持编辑 budget 名称和金额。
5. 新用户首次登录时自动初始化三档：
   - 2000
   - 3000
   - 4000
6. budget 卡片上要显示：
   - 月预算
   - 日均预算
   - 本月至今已花
   - 本月至今节约/超支
   - 本月剩余余额
   - 剩余日均可花
7. 用户可以选择一个默认 budget。
8. 页面仍然要展示所有 budget 的对比结果，不要只展示默认 budget。
9. 默认 budget 只是用于月历格子的简略展示。

【重要补充】历史数据冻结原则：
月历和每日详情中显示的“默认 budget 节约/超支”，必须优先使用该日期所在月份设定的默认 Budget。
当用户在某个月份中旬切换默认 Budget 时，需要在切换时记录 effective_date。查询历史月份时，取该月最后一天生效的 budget 作为该月的历史锚点。
如果无法精确追溯历史归属，至少要做到：当前查看的月份与当前默认 Budget 的创建月份不一致时，在 UI 中显示提示“当前查看的月份使用 XX 元预算（历史设定）”，避免用户误以为本月预算回溯到了过去。

---

## 4. 核心功能二：每日三餐记录

用户每天可以填写三顿饭：

```text
早饭 breakfast
午饭 lunch
晚饭 dinner
```

每日记录结构建议：

```ts
type DayRecord = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  breakfast?: number;
  lunch?: number;
  dinner?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

要求：

1. 每天每顿饭都有独立输入框。
2. 金额允许为空，空表示未记录，不等于 0。
3. 用户输入 0 是合法的，表示这顿没花钱。
4. 输入必须是非负数。
5. 支持小数，最多保留两位。
6. 输入错误要在字段旁边提示，不要只在页面顶部提示。
7. 保存后刷新页面数据不丢失。
8. 换手机 / 换电脑登录同一账号后数据仍然存在。
9. 今天日期要突出显示。
10. 用户可以回填过去日期，也可以提前填写未来日期；未来日期要有轻微提示，例如「未来日期」。

---

## 5. 核心功能三：每顿饭理论允许花销

App 要计算每顿饭理论允许花销。

请实现两套口径，并在 UI 中清楚标注。

### 5.1 固定月均口径

默认早饭额度为￥10，午饭/晚饭平分剩下的每日 budget

### 5.2 动态剩余额度口径

根据本月已经花掉的钱，动态计算从当前日期到月底还可以怎么花。

```ts
spentBeforeDate = 本月从1号到 selectedDate 前一天的总花销
remainingFromDate = monthlyBudget - spentBeforeDate
remainingDaysIncludingSelectedDate = selectedDate 到月底的天数
dynamicDailyAllowance = remainingFromDate / remainingDaysIncludingSelectedDate
dynamicMealAllowance = dynamicDailyAllowance / 3
```

UI 默认展示动态口径，因为它更符合「之后还能花多少」的需求；固定口径作为参考展示。

【重要补充】动态口径的使用场景限制：
- 当 selectedDate >= 今天时：使用动态剩余公式（remainingFromDate / remainingDaysIncludingSelectedDate），表示“从今天起平均每天还能花多少”。
- 当 selectedDate < 今天时：动态剩余额度应冻结为当天的静态日均预算（monthlyBudget / daysInMonth），并在 UI 中标注为“历史日均（参考值）”，不得使用剩余天数反推。

---

## 6. 核心功能四：单顿饭节约 / 超支计算

对每一档 budget、每一天、每一顿饭，计算：

```ts
mealDiff = mealAllowance - actualMealCost
```

解释：

```text
mealDiff > 0：节约
mealDiff = 0：刚好
mealDiff < 0：超支
```

显示文案：

```text
节约 ¥12.50
超支 ¥8.00
刚好
```

颜色规则：

```text
节约：绿色
超支：红色
刚好：中性灰/蓝
```

注意：

1. 未填写的饭不参与「单顿实际差额」计算，但可以显示理论额度。
2. 输入 0 时要参与计算。
3. 三顿饭每一顿都应能看到在不同 budget 下的节约/超支。
4. 为了避免页面过于拥挤，可以在每日详情里显示所有 budget 的详细对比；在月历格子里显示默认 budget 的简略结果。

---

## 7. 核心功能五：今日总花销与 budget 对比

每天总花销：

```ts
dailyFoodTotal = breakfast + lunch + dinner
dailyExtraTotal = 当天所有额外花销之和
dailyTotal = dailyFoodTotal + dailyExtraTotal
```

每档 budget 的今日理论预算：

```ts
fixedDailyAllowance = monthlyBudget / daysInMonth
dynamicDailyAllowance = 动态剩余额度口径下的当天可用额度
```

今日差额：

```ts
dailyDiff = dynamicDailyAllowance - dailyTotal
```

显示：

```text
今日花销：¥xx
今日预算：¥xx
今日节约/超支：¥xx
```

---

## 8. 核心功能六：本月至今节约 / 超支 / 余额

对每档 budget，计算本月到当前选中日期为止的累计情况：

```ts
monthSpentToDate = 从本月1号到 selectedDate 的所有三餐 + 额外花销
elapsedDays = 本月1号到 selectedDate 的天数
monthBudgetToDate = monthlyBudget / daysInMonth * elapsedDays
diffToDate = monthBudgetToDate - monthSpentToDate
remainingMonthBalance = monthlyBudget - monthSpentToDate
remainingDaysAfterSelectedDate = selectedDate 后到月底的天数
remainingDailyAllowance = remainingMonthBalance / max(remainingDaysAfterSelectedDate, 1)
remainingMealAllowance = remainingDailyAllowance / 3
usageRate = monthSpentToDate / monthlyBudget
```

展示字段：

```text
本月至今已花
按进度应花
本月至今节约/超支
本月剩余余额
剩余每天可花
剩余每顿可花
预算使用率
```

注意：

1. 如果 `remainingMonthBalance < 0`，显示「本月已超支 ¥xx」。
2. 如果 `remainingDailyAllowance < 0`，显示「之后即使不花也已超支」。
3. 月底当天剩余日数要避免除以 0。

---

## 9. 核心功能七：额外花销记录

用户除了三餐，还会有额外花销，例如：

```text
奶茶
水果
交通
日用品
娱乐
其他
```

每条额外花销至少包含：

```ts
type ExtraExpense = {
  id: string;
  user_id: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  category: string;   // 饮料/零食/交通/日用品/娱乐/学习/其他
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

要求：

1. 每天页面中要有「额外花销」区域。
2. 支持新增、编辑、删除额外花销。
3. 每条额外花销有金额、类别、备注。
4. 额外花销必须计入当天总花销和本月累计花销。
5. 月历格子中要显示当天额外花销总额。
6. 月度汇总中要显示额外花销总额和按类别汇总。
7. 类别可以用下拉选项或普通选择器。
8. 不要做快捷金额填入。

---

## 10. 日历功能要求

### 10.1 月历视图

App 中必须用 calendar 的形式展示每个月。

要求：

1. 显示当前年/月。
2. 可以切换上个月 / 下个月。
3. 可以回到今天。
4. 每个日期格子显示：
   - 公历日期：日
   - 星期几
   - 农历日期
   - 是否周末
   - 当天三餐是否已记录
   - 当天总花销
   - 默认 budget 下当天节约/超支
5. 今天要高亮。
6. 选中的日期要高亮。
7. 周末要有轻微背景区分。
8. 有花销记录的日期要有小标记。
9. 超支日期要有红色提示。
10. 节约日期要有绿色提示。
11. 当天在“所有 budget”下的节约/超支综合状态（由于格子空间有限，不具体显示每个 budget 的数值，而是显示“多档综合标记”）：
   - 如果所有 budget 下当天都是节约 → 显示绿色圆点 ✅
   - 如果所有 budget 下当天都是超支 → 显示红色圆点 ❌
   - 如果有的超支有的节约（混合）→ 显示橙色圆点 ⚠️
   - 如果当天无任何记录 → 不显示标记
12. 日历顶部（月份切换栏旁边）必须增加一个“日历显示筛选器”，允许用户选择“在日历格子上具体显示哪一档 budget 的数值”。选项包括“全部（只显示综合标记）”和所有已设定的 budget 名称。当用户选择某一具体档位（如 3000）时，格子中的“节约/超支”数字精确显示为该档位的计算结果；当选择“全部”时，按第 6 条显示综合标记。

### 10.2 星期排列必须从周一开始

日历表头必须是：

```text
周一 周二 周三 周四 周五 周六 周日
```

不能是：

```text
周日 周一 周二 周三 周四 周五 周六
```

请不要依赖浏览器 locale 自动决定一周起始日，必须在代码中明确设置周一为第一列。

构造月历矩阵时：

```ts
// JS getDay(): Sunday=0, Monday=1, ..., Saturday=6
// 转换成 Monday=0, ..., Sunday=6
mondayBasedIndex = (date.getDay() + 6) % 7
```

### 10.3 农历显示

每个日期格子要显示农历。

要求：

1. 使用可靠的 JS 农历转换库，例如 `lunar-javascript`，或实现一个独立的 `getLunarDate(date)` 工具函数。
2. 显示格式：
   - 农历月份必须使用中文数字：正月、二月、三月……腊月。
   - 农历日期必须使用中文数字：初一、初二……初十、十一……二十、廿一……三十。
   - 如果农历库返回 isLeap: true，必须在月份前加“闰”字，例如“闰二月十五”。
   - 在日历格子空间有限时，可缩略为“正一”、“初二”，但在日期详情页标题必须展示完整格式“农历腊月廿三”。
1. 如果有节气 / 节日能力，可以显示春节、中秋、端午等；没有也可以先不做。
2. 如果农历库加载失败，不要让页面崩溃；显示 `农历--`。
3. 农历功能要封装在单独文件：

```text
src/utils/lunar.ts
```

### 10.4 是否周末

周末定义：

```ts
isWeekend = date.getDay() === 0 || date.getDay() === 6
```

周六 / 周日格子要显示「周末」或用背景色提示。

---

## 11. 页面结构建议

### 11.1 未登录页面

未登录时显示：

```text
App 名称：生活费预算记账
简短说明：记录三餐和额外花销，按多档生活费预算自动计算节约/超支
登录方式：邮箱登录
```

### 11.2 顶部总览 Dashboard

登录后页面顶部显示：
- 标题、当前月份、今日日期、当前登录用户、退出按钮。
- 核心总览区：不按默认 budget 展示，而是按“所有 budget”展示。采用横向滚动卡片或网格布局，每个卡片对应一个 budget（如 2000、3000、4000），每张卡片内统一显示：
    - 档位名称
    - 月预算
    - 本月至今已花
    - 本月至今节约/超支
    - 本月剩余余额
    - 剩余日均可花
    - 预算使用率进度条
- 如果 budget 数量太多（超过 5 个），允许卡片横向滑动，但必须明确提示用户左右滑动查看全部。
- 在卡片区上方，额外显示一行“今日总花销（绝对值）”，该值与 budget 无关，仅作为参考。

### 11.3 Budget 对比区

每个 budget 一张卡片：

```text
预算名
月预算
日均预算
动态剩余日均可花
本月至今节约/超支
本月剩余余额
预算使用率进度条
```

预算使用率：

```ts
usageRate = monthSpentToDate / monthlyBudget
```

显示规则：

```text
0% - 80%：正常
80% - 100%：接近用完
>100%：超支
```

### 11.4 月历区

主区域显示月历。

每个日期格子至少显示：

```text
日期数字
星期 / 周末标记
农历
总花销
默认 budget 下：节约/超支
三餐记录状态：早/午/晚
额外花销数量
```

点击日期后，右侧或下方显示该日详情。

### 11.5 日期详情区

选中某天后显示：

```text
YYYY年MM月DD日 星期X 农历X 是否周末
```

三餐输入区域：
- 早餐、午餐、晚餐各一行输入框。
- 在每顿饭输入框的右侧或下方，必须同时列出所有 budget 档位下的“理论额度”和“节约/超支”。
- 展示格式示例（以早餐为例）：
  [早餐输入框: 15.00]
  理论额度：2000档 ¥10.00 | 3000档 ¥15.00 | 4000档 ¥20.00
  节约/超支：2000档 超支¥5.00 🔴 | 3000档 刚好🟦 | 4000档 节约¥5.00 🟢
- 如果 budget 数量超过 4 个，允许换行展示，但必须全部可见，不能折叠。

旁边显示每顿在各 budget 下的理论额度和节约/超支。

额外花销：

```text
额外花销列表
新增额外花销表单
类别选择
金额输入
备注输入
```

当日汇总区域：
- 显示“今日三餐合计”、“今日额外花销”、“今日总花销”。
- 在“今日总花销”下方，必须用并列卡片或表格展示每一档 budget 下的：
   · 今日预算（动态口径）
   · 今日节约/超支
   · 本月累计节约/超支
   · 本月剩余余额
- 表格表头为各 budget 名称（如“2000 档”、“3000 档”），每一行是一个指标。

### 11.6 月度统计区

实现一个月度统计区域，至少包括：

```text
本月总支出
三餐总支出
额外花销总支出
早餐总支出
午餐总支出
晚餐总支出
平均每天花销
平均每顿饭花销
额外花销分类排行
超支最多的日期
节约最多的日期
```

可以先用简单卡片和表格实现，不一定要做复杂图表。

---

## 12. 数据库设计

请在 Supabase 中创建以下表。

### 12.1 budgets

```sql
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  currency text not null default 'CNY',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 12.2 day_records

```sql
create table public.day_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  breakfast numeric(12,2),
  lunch numeric(12,2),
  dinner numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date),
  check (breakfast is null or breakfast >= 0),
  check (lunch is null or lunch >= 0),
  check (dinner is null or dinner >= 0)
);
```

### 12.3 extra_expenses

```sql
create table public.extra_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default '其他',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 12.4 app_settings

```sql
create table public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_budget_id uuid references public.budgets(id) on delete set null,
  week_starts_on int not null default 1,
  meal_weights jsonb not null default '{"breakfast": 1, "lunch": 1, "dinner": 1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 13. Row Level Security 要求

所有表必须开启 RLS。

示例策略：

```sql
alter table public.budgets enable row level security;
alter table public.day_records enable row level security;
alter table public.extra_expenses enable row level security;
alter table public.app_settings enable row level security;

create policy "Users can view own budgets"
on public.budgets for select
using (auth.uid() = user_id);

create policy "Users can insert own budgets"
on public.budgets for insert
with check (auth.uid() = user_id);

create policy "Users can update own budgets"
on public.budgets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own budgets"
on public.budgets for delete
using (auth.uid() = user_id);
```

请为所有表补齐 select / insert / update / delete 策略。

重要：不要在前端使用 service role key。前端只能使用 Supabase anon public key。

---

## 14. 计算逻辑必须集中封装

不要把计算公式散落在 JSX 里。请创建独立工具文件：

```text
src/utils/budgetCalculations.ts
src/utils/dateUtils.ts
src/utils/lunar.ts
src/utils/format.ts
src/utils/validation.ts
```

建议函数：

```ts
getDaysInMonth(year: number, month: number): number

getMonthRange(date: Date): { start: Date; end: Date }

getMonthKey(date: Date): string // YYYY-MM

formatCurrency(amount: number): string

calculateDayTotal(dayRecord: DayRecord, extraExpenses: ExtraExpense[]): {
  foodTotal: number;
  extraTotal: number;
  total: number;
}

// 注意：该函数必须接收多个 budget，返回 Map 结构，以便前端并行渲染
calculateAllBudgetsStatus(params: {
  budgets: BudgetPlan[];
  dayRecords: DayRecord[];
  extraExpenses: ExtraExpense[];
  selectedDate: Date;
}): Map<string, {                  // key 为 budget.id
  budgetName: string;
  monthlyAmount: number;
  daysInMonth: number;
  fixedDailyAllowance: number;
  dynamicDailyAllowance: number;
  monthSpentToDate: number;
  diffToDate: number;
  remainingMonthBalance: number;
  remainingDailyAllowance: number;
  usageRate: number;
}>

calculateMealDiff(params: {
  actual?: number;
  mealAllowance: number;
}): {
  status: "saved" | "overspent" | "even" | "empty";
  diff: number | null;
}
```

---

## 15. 前端数据层

请封装 Supabase client：

```text
src/lib/supabase.ts
```

环境变量：

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

封装 API：

```text
src/services/budgetService.ts
src/services/dayRecordService.ts
src/services/extraExpenseService.ts
src/services/settingsService.ts
src/services/authService.ts
```

要求：

1. 组件不要直接到处写 Supabase 查询。
2. 所有数据库操作通过 service 层。
3. 错误要捕获并显示友好提示。
4. 保存中要有 loading 状态。
5. 网络失败要显示「保存失败，请检查网络」。
6. 读取失败要显示重试按钮。

---

## 16. 本地缓存

可以使用 IndexedDB 或 localStorage 做辅助缓存，但不能作为唯一数据源。

建议：

```text
1. Supabase 是权威数据源
2. 本地缓存最近一次成功加载的数据
3. 页面启动时可以先显示缓存，再从云端刷新
4. 如果云端刷新失败，提示“当前显示的是本地缓存数据”
5. 离线状态下不要默默写入云端失败的数据
```

如果实现离线写入，必须实现：

```text
1. pending mutations 队列
2. 网络恢复后同步
3. 冲突处理
4. 同步失败提示
```

如果没有时间实现离线写入，请不要伪装成支持离线保存。

【重要补充】为了实现流畅的移动端体验，所有增、删、改操作（三餐保存、额外支出添加）必须采用“乐观更新（Optimistic Update）”策略：
1. 用户点击保存后，立即更新 UI 中的数据和汇总数字（显示为临时状态）。
2. 同时在后台向 Supabase 发起请求。
3. 若请求成功，将临时状态转为永久状态（无感知）。
4. 若请求失败（网络错误或 RLS 冲突），将 UI 数据回滚至操作前状态，并弹出 Toast 提示“保存失败，请重试”。
5. 禁止使用全局 Loading 遮罩层阻塞用户操作。

---

## 17. UI / UX 要求

整体风格：

```text
干净
轻量
适合每天打开快速记录
信息密度中等偏高
不要做得像企业财务系统
```

**整体美学：纪录片式黑白极简风格（High-contrast Monochrome Aesthetic）**。

1. 摒弃多余的阴影（box-shadow）、渐变色和过度圆角。
2. 利用充足的留白（Negative Space）和极其清晰的排版（Typography）来划分数据区域。
3. 除红色（超支）和绿色（节约）等作为绝对必要的数据点缀色外，整个页面应呈现极致的黑、白、灰高对比度，视觉观感应当像专业的硬核数据仪表盘。

### 17.1 颜色规则

```text
节约 / 余额为正：绿色
超支 / 余额为负：红色
警告 / 接近用完：橙色
普通信息：灰色 / 蓝色
```

### 17.2 金额显示

统一格式：

```text
¥1,234.56
```

负数不要显示成 `¥-123`，建议显示：

```text
超支 ¥123.00
```

### 17.3 表单体验

1. 金额输入框使用 `input type="number"` 或自定义数字输入。
2. 不允许负数。
3. 最多两位小数。
4. 错误提示显示在对应字段旁边。
5. 保存成功后有轻量反馈。
6. 删除额外花销和 budget 前要确认。
7. 不要实现快捷金额按钮。

### App.tsx

负责：

```text
初始化 Supabase session
加载当前用户
维护 selectedDate 和 displayedMonth
组合页面布局
根据登录状态显示 AuthPage 或主界面
```

### 17.4 响应式

至少适配：

```text
手机端：单列布局，Dashboard -> 月历 -> 日期详情 -> 月度统计
iPad：两列布局，月历 + 日期详情
桌面端：顶部总览，左侧月历，右侧日期详情，下方统计
```

请使用 mobile-first 思路实现 CSS。

### 17.5 日期交互细节

1. 在移动端，点击日历中的日期后，页面应自动平滑滚动（scrollIntoView）到详情面板的顶部。
2. 日历中被选中的日期格子，除了背景色高亮外，必须添加一个底部边框（border-bottom: 3px solid blue）或外发光，确保当详情面板滚动时，用户仍能清晰地知道当前编辑的是哪一天。

---

## 18. 推荐文件结构

```text
src/
  App.tsx
  main.tsx
  lib/
    supabase.ts
  services/
    authService.ts
    budgetService.ts
    dayRecordService.ts
    extraExpenseService.ts
    settingsService.ts
  types/
    index.ts
    database.ts
  utils/
    budgetCalculations.ts
    dateUtils.ts
    lunar.ts
    format.ts
    validation.ts
  components/
    AuthPage.tsx
    Dashboard.tsx
    BudgetPlanCard.tsx
    BudgetPlanManager.tsx
    CalendarMonth.tsx
    CalendarDayCell.tsx
    DayDetailPanel.tsx
    MealExpenseForm.tsx
    ExtraExpenseList.tsx
    ExtraExpenseForm.tsx
    MonthlyStats.tsx
    ImportExportPanel.tsx
    NetworkStatusBanner.tsx
  styles/
    globals.css
supabase/
  migrations/
    001_init.sql
public/
  manifest.webmanifest
  icons/
```

---

## 19. 组件职责

### AuthPage.tsx

负责登录 / 注册 / magic link。

### Dashboard.tsx

负责顶部总览。

### BudgetPlanManager.tsx

负责预算新增、编辑、删除、默认选择。

### CalendarMonth.tsx

负责月历矩阵生成与渲染。

### CalendarDayCell.tsx

负责单个日期格子展示。

### DayDetailPanel.tsx

负责选中日期详情。

### MealExpenseForm.tsx

负责早餐 / 午餐 / 晚餐输入。

### ExtraExpenseList.tsx / ExtraExpenseForm.tsx

负责额外花销列表和新增编辑。

### MonthlyStats.tsx

负责月度统计。

### NetworkStatusBanner.tsx

负责网络状态提示。

---

## 20. 数据导入导出

提供：

```text
导出 JSON
导入 JSON
```

用途：备份个人记账数据。

导出内容包括：

```text
budgets
dayRecords
extraExpenses
settings
```

导入时要校验格式，不能导入坏数据导致 App 崩溃。

注意：

1. 导出只导出当前登录用户的数据。
2. 导入的数据归属当前登录用户。
3. 不允许导入覆盖其他用户数据。
4. 导入前提示用户确认。
5. 可以选择「合并导入」或「覆盖当前月份」，至少实现一种并说明。

---

## 21. 月度视图状态筛选

允许快速查看：

```text
全部日期
只看超支日期
只看有额外花销日期
只看未完整记录三餐的日期
```

完整记录定义：

```text
早餐、午餐、晚餐三个字段都不是 undefined / null
```

注意：0 元算已记录。

---

## 22. 备注

每一天可以有一个日备注，例如：

```text
今天聚餐
今天没吃晚饭
今天报销了一部分
```

---

## 23. 边界情况

请特别处理以下情况：

1. budget 为 0 或负数：不允许保存。
2. 金额为空：未记录，不要当作 0。
3. 金额为 0：合法，参与计算。
4. 小数超过两位：保存时四舍五入或阻止输入，保持一致。
5. 删除 budget 时，如果它是唯一剩余的 budget，则禁用删除按钮并提示“至少保留一档预算，无法删除”。如果它不是唯一，删除后若它是默认 budget，则自动选择剩余 budget 中的第一个作为新默认。
   历史详情页若用户切换到一个已被删除的 budget（理论上不应发生），默认使用当前剩余的第一个 budget 作为兜底计算，并显示提示“原预算已删除，使用当前预算测算”。
6. 没有任何 budget 时，要提示用户添加 budget，并提供默认创建按钮。
7. 月份切换时，计算只基于当前显示月份。
8. 跨月数据不要混在一起。
9. 2 月、闰年、大小月要正确。
10. 日历第一列必须永远是周一。
11. 农历转换失败时页面不能崩溃。
12. Supabase 读取失败时要显示错误状态。
13. 导入 JSON 失败时要显示可理解错误提示。
14. 未来日期可以编辑，但要显示「未来日期」提示。
15. 当本月已经超支时，剩余日均可花可能是负数，要用明确文案展示。
16. 未登录不能读写数据。
17. RLS 策略必须阻止用户访问别人的数据。
18. 网络断开时不能假装保存成功。

---

## 24. 测试与校验

请至少写一些核心计算函数测试。若项目没有测试框架，可以用 Vitest。

重点测试：

1. 月天数计算：
   - 2024-02 有 29 天
   - 2025-02 有 28 天
2. 周一开始的日历矩阵：
   - 表头必须周一到周日
   - JS Sunday=0 要正确转换到最后一列
3. dailyTotal：
   - 空字段不计入
   - 0 元计入
   - 额外花销计入
4. budget status：
   - 2000 budget 在 30 天月份下日均 66.67
   - 三餐均分约 22.22
   - 超支 / 节约符号正确
5. 月度剩余：
   - 已花超过 budget 时 remaining 为负
6. 删除默认 budget 后默认 budget 重新选择。
7. JSON 导入校验。
8. 未登录状态不能进入主界面。
9. Supabase service 层在请求失败时返回可处理错误。
10. RLS SQL migration 存在并开启。

---

## 25. 部署要求

请提供部署说明。

### 25.1 Supabase

需要说明：

```text
1. 如何创建 Supabase project
2. 如何运行 SQL migration
3. 如何开启 Auth 登录方式
4. 如何配置 RLS policy
5. 如何获取 project URL 和 anon key
```

### 25.2 Vercel

需要说明：

```text
1. 如何连接 GitHub 仓库
2. 如何设置环境变量
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. 如何部署
4. 如何查看生产 URL
5. 如何重新部署
```

### 25.3 本地开发命令

```bash
npm install
npm run dev
```

### 25.4 构建命令

```bash
npm run build
```

### 25.5 预览命令

```bash
npm run preview
```

---

## 26. 验收标准

完成后，App 应满足以下验收标准：

1. 打开公网 URL 后能访问页面。
2. 手机 / 电脑 / iPad 浏览器都能访问。
3. 可以登录 / 退出登录。
4. 新用户首次登录后能看到 2000 / 3000 / 4000 三档 budget。
5. 能新增、编辑、删除 budget。
6. 能选择默认 budget。
7. 能在今天输入早餐、午餐、晚餐金额。
8. 能为今天新增额外花销。
9. 额外花销会计入今日总花销和月度总花销。
10. 页面能显示每档 budget 下：
    - 今日节约 / 超支
    - 本月至今节约 / 超支
    - 本月剩余余额
    - 剩余日均可花
    - 剩余每顿可花
11. 月历从周一开始排列。
12. 每个日期显示公历日、星期 / 周末状态、农历。
13. 今天高亮。
14. 选中日期高亮。
15. 周末有明显但不刺眼的标识。
16. 刷新页面后数据仍然存在。
17. 换设备登录同一账号后数据仍然存在。
18. 手机宽度下页面仍然可用。
19. iPad 宽度下页面布局合理。
20. 输入负数金额会被阻止或提示错误。
21. 金额显示统一为人民币格式。
22. 构建命令成功，无 TypeScript 错误。
23. Supabase RLS 已开启，不能读取其他用户的数据。
24. Vercel 生产环境部署成功。
25. 不存在快捷金额填入功能。

---

## 27. 实施顺序

### Phase 1：项目与云端数据层

1. 检查仓库结构。
2. 建立或沿用 React + TypeScript + Vite 项目。
3. 配置 Supabase client。
4. 创建 Supabase migration。
5. 建立 Auth。
6. 建立 RLS policy。
7. 实现 service 层。
8. 新用户初始化默认 budget。

### Phase 2：核心计算

1. 实现日期工具。
2. 实现预算计算工具。
3. 实现金额格式化。
4. 实现农历工具。
5. 写核心计算测试。

### Phase 3：核心 UI

1. AuthPage。
2. Dashboard。
3. BudgetPlanManager。
4. CalendarMonth。
5. DayDetailPanel。
6. MealExpenseForm。
7. ExtraExpenseForm/List。

### Phase 4：在线体验与移动端

1. 响应式布局。
2. PWA manifest。
3. 网络状态提示。
4. 本地缓存最近读取数据。
5. 移动端触控体验优化。

### Phase 5：月度统计与增强

1. MonthlyStats。
2. ImportExportPanel。
3. 记录完整度。
4. 筛选超支日期。
5. 日备注。

### Phase 6：部署与文档

1. 配置 Vercel 环境变量。
2. 部署到生产 URL。
3. 写 README。
4. 说明如何本地运行、如何部署、如何配置 Supabase。
5. 执行最终验收。

---

## 28. 重要实现细节

请注意：

1. 不要把所有逻辑写在 App.tsx 里。
2. 计算逻辑必须可测试。
3. 日期统一使用 YYYY-MM-DD 作为 dayRecord 主键，但严禁直接使用 new Date().toISOString().split('T')[0] 获取今日日期。
   必须在 src/utils/dateUtils.ts 中实现 getTodayInLocalTimezone() 函数，确保日期基于用户浏览器当前时区（Asia/Shanghai）的 00:00:00。
   所有发送给 Supabase 的 date 字段必须是 string 类型（YYYY-MM-DD），前端展示时统一使用 dayjs 解析该字符串，禁止进行 new Date(dateString) 的隐式转换。
4. 月份统一使用 `YYYY-MM` 作为筛选 key。
5. 不要用字符串金额参与计算，保存前转换成 number。
6. 不要在 JSX 中重复写复杂公式。
7. 所有预算都要一起展示，不要只展示默认 budget。
8. 默认 budget 只是用于月历简略显示。
9. 详情页必须能看到所有 budget 的对比。
10. 农历显示失败不能影响记账主功能。
11. UI 不需要复杂动画，优先稳定、清晰、可维护。
12. 前端不要暴露 Supabase service role key。
13. 所有用户数据表必须有 user_id。
14. 所有用户数据查询必须按当前用户隔离。
15. 不要实现快捷金额填入功能。
16. 线上部署优先于纯本地存储。
17. IndexedDB / localStorage 只能作为缓存，不是主数据库。

---

## 29. 最终交付说明

开发完成后，请输出：

1. 你创建 / 修改了哪些文件。
2. 如何本地运行：
   ```bash
   npm install
   npm run dev
   ```
3. 如何构建：
   ```bash
   npm run build
   ```
4. 如何配置 Supabase：
   - project URL
   - anon key
   - SQL migration
   - Auth 设置
   - RLS policy
5. 如何部署到 Vercel。
6. 生产 URL 在哪里查看。
7. 主要功能如何使用。
8. 已知限制。
9. 后续可扩展建议。
