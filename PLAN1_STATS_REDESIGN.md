# 修改 Plan：生活费记账应用 — 视觉重构 + 统计页面

## 0. 背景与约束（先读）

这是一个 **React 18 + TypeScript + Vite + Supabase** 的记账应用，入口 `src/App.tsx`，全局样式集中在单文件 `src/styles/globals.css`。数据模型见 `src/types/index.ts`：
- `DayRecord`：`breakfast/lunch/dinner`（`number | null`）+ 各自 `*Note` + 日 `note`，按 `date`（`YYYY-MM-DD`）。
- `ExtraExpense`：`amount` / `category`（中文，见 `src/utils/extraCategories.ts`）/ `note` / `date`。
- `BudgetPlan`：`monthlyAmount`，可多档。
- 纯函数计算在 `src/utils/budgetCalculations.ts`、`src/utils/format.ts`、`src/utils/dateUtils.ts`。

**硬约束（不得违反）：**
1. 不要改动 Supabase 读写逻辑、optimistic update 流程、`services/*`、`lib/supabase.ts` 的行为。
2. 现有测试必须继续通过：`budgetCalculations.test.ts`、`extraCategories.test.ts`、`markdownExportService.test.ts`（`npm test`）。
3. 所有金额展示统一走 `formatCurrency`；日期 key 统一 `YYYY-MM-DD` 并用 `dateUtils` / `dayjs`，**不要手写时区转换**。
4. 保持移动端可用（现有 `@media (max-width: 1100px / 720px)` 断点逻辑要延续到新页面）。
5. 文案保持中文。

---

## 第一部分：视觉重构（"性冷淡"极简风 + 衬线字体）

### 1.1 字体

目标字体：**Libre Baskerville**（拉丁/数字）+ **Noto Serif SC**（中文）。

在 `index.html` 的 `<head>` 内、`<title>` 之前加入（用 preconnect 优化加载）：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Noto+Serif+SC:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

在 `globals.css` 把全局字体栈改为：
```css
font-family: "Libre Baskerville", "Noto Serif SC", Georgia, "Songti SC", serif;
```
- 数字对齐：在所有金额/数字元素（`.cell-money`、`.today-absolute strong`、`.metric strong`、`.budget-table`、统计页 KPI）加 `font-variant-numeric: tabular-nums;`。
- 全局 `body` 设 `line-height: 1.6`、`-webkit-font-smoothing: antialiased`、`text-rendering: optimizeLegibility`。
- 把 `meta name="theme-color"` 从 `#111111` 改为下方新的 paper/ink 主色。

### 1.2 配色 token（替换 `:root` 变量）

把现有 `:root` 的颜色变量整体替换为下面这套低饱和、暖灰的极简配色（保留变量名以减少改动，新增几个）：

```css
:root {
  --paper:        #F6F5F1;   /* 页面底色，暖象牙白 */
  --panel:        #FFFFFF;   /* 卡片/面板 */
  --panel-sunken: #FBFAF7;   /* 次级背景（表头、空格） */
  --ink:          #23211C;   /* 主文字，柔和炭黑（非纯黑） */
  --muted:        #8C887E;   /* 次要文字，暖灰 */
  --line:         #E7E4DC;   /* 1px 发丝线，替换原 2px 黑边 */
  --line-strong:  #CFCBC0;   /* 需要强调的分隔 */

  /* 语义色：全部去饱和，避免刺眼 */
  --green:  #5E7C6A;   /* 节约 */
  --red:    #A85A50;   /* 超支 */
  --orange: #B08A4F;   /* 预警 */
  --blue:   #5B6B82;   /* 中性强调/选中 */

  /* 统计图表分类色板（柔和、互相协调，见 1.5） */
  --c1:#6E7F76; --c2:#A88F6B; --c3:#8A7B86; --c4:#7E8AA0;
  --c5:#9C7E72; --c6:#7C8C7A; --c7:#B0A07A; --c8:#86807A;

  color: var(--ink);
  background: var(--paper);
  font-size: 16px;
}
```

### 1.3 去"报纸/野兽派"风，改极简

逐项调整 `globals.css`：
- **边框**：所有 `2px solid var(--ink)` / `border: 2px solid` → `1px solid var(--line)`。`.budget-card.default`、`.calendar-cell.today`、`.auth-panel` 的强调改为 `1px solid var(--line-strong)` 或细微背景区分，**不要用粗黑边**。
- **圆角**：统一 `--radius: 10px`（卡片/面板/输入），按钮 `8px`。整体比现在更柔。
- **阴影**：极克制。卡片可加 `box-shadow: 0 1px 2px rgba(35,33,28,.04)`，hover 再轻微抬升；不要重投影。
- **按钮**：
  - `.primary-button`：`background: var(--ink); color: var(--paper);`（炭黑底，不是纯黑），`font-weight:500`，hover 时 `opacity:.88`。
  - `.secondary-button / .small-button`：白底 + `1px solid var(--line-strong)`，hover `background: var(--panel-sunken)`。
  - `.icon-button`：去边框或极淡边框，hover 才显边。
- **留白**：`.section-block` padding 提到 `20px 22px`；`main-layout` / `left/right-column` gap 提到 `22px`；KPI/metric 间距放宽。
- **`.eyebrow`**：保留小字号大写 + `letter-spacing: 0.12em`，颜色 `--muted`，作为极简风的"标签"。
- **大数字**：`.today-absolute strong` 用 Libre Baskerville，`font-weight:700`，`clamp(2rem, 5vw, 3.4rem)`，配合细横线分隔（保留上下 `--line`）。
- **进度条** `.progress-track`：高度降到 `6px`，圆角 `999px`，底色 `--panel-sunken`，fill 用语义色但去饱和版本。
- **日历**：`.calendar-grid` 的 `gap:1px` + 线色改 `--line`；`.calendar-cell.selected` 用 `--panel-sunken` 背景 + 底部 `2px var(--blue)`；`.today` 用细描边而非粗黑。`.meal-flags b` 用发丝边、done 态用 `--ink` 文本即可。
- **滚动条**（可选）：给 `.budget-scroll` 等加细滚动条样式，贴合极简。

> 原则：**层级靠"字重 + 字号 + 留白 + 极淡分隔线"区分，而不是靠黑色块和粗边框。** 颜色只在语义（节约/超支）和图表里出现，且都低饱和。

### 1.4 顶部导航（为第二部分铺路）

在 `Dashboard` 上方（或整合进 `dashboard-band`）加一个极简的**视图切换 Tab**：`记账` / `统计`。样式：纯文字按钮，选中项下方一条 `2px var(--ink)` 下划线，未选中为 `--muted`。详见 2.1。

### 1.5 图表配色（供 Recharts 用，见第二部分）

新建 `src/styles/chartTheme.ts`，导出与上面 CSS 变量一致的常量（Recharts 需要 JS 里的色值，不能直接读 CSS 变量）：

```ts
export const CHART = {
  ink: "#23211C", muted: "#8C887E", line: "#E7E4DC",
  paper: "#F6F5F1", panel: "#FFFFFF",
  green: "#5E7C6A", red: "#A85A50",
  categorical: ["#6E7F76","#A88F6B","#8A7B86","#7E8AA0","#9C7E72","#7C8C7A","#B0A07A","#86807A"],
  fontFamily: '"Libre Baskerville","Noto Serif SC",serif',
};
```

---

## 第二部分：独立「统计」页面（Recharts，自定义区间 + 任意分类下钻）

### 2.0 依赖

```
npm install recharts
```
（dayjs 已存在，复用它做区间预设与日期遍历。）

### 2.1 视图切换（改 `App.tsx`）

- 新增状态：`const [view, setView] = useState<"ledger" | "stats">("ledger");`
- 在 `Dashboard` 里渲染 Tab（`记账` / `统计`），通过 props `view` / `onChangeView` 控制。
- `App` 渲染逻辑：`view === "ledger"` 时渲染现有 `main-layout`；`view === "stats"` 时渲染新组件 `<StatsPage data={data} />`。
- `Dashboard`（预算横向卡片band）在两个视图都保留在顶部，保持上下文一致。
- 把现有右栏的 `<MonthlyStats>` **从 ledger 视图移除**，其内容并入统计页（ledger 右栏只留 `DayDetailPanel` + `ImportExportPanel`，更清爽）。

### 2.2 纯函数聚合层（新建 `src/utils/stats.ts` + 测试）

所有统计计算放纯函数里，便于测试、不污染组件。复用 `calculateDayTotal`。建议签名：

```ts
export type DateRange = { start: string; end: string }; // YYYY-MM-DD, inclusive

// 区间预设
export function presetRange(kind:
  "today"|"yesterday"|"dayBefore"|"thisWeek"|"thisMonth"|"lastMonth"|"last30"|"thisYear",
  today?: string): DateRange;

// 遍历区间内每一天的明细（缺失天补 0），用于趋势图
export function dailySeries(range: DateRange, dayRecords: DayRecord[], extras: ExtraExpense[]):
  Array<{ date: string; breakfast:number; lunch:number; dinner:number; food:number; extra:number; total:number }>;

// 区间汇总（总额/三餐/额外/日均/每顿均值/笔数/有记录天数）
export function summarizeRange(range: DateRange, dayRecords: DayRecord[], extras: ExtraExpense[]): RangeSummary;

// 额外花销按 category 聚合，降序
export function extraByCategory(range: DateRange, extras: ExtraExpense[]):
  Array<{ category: string; amount: number; count: number; share: number }>;

// 三餐维度聚合（早/午/晚 各自总额、均值、占比）
export function mealBreakdown(range: DateRange, dayRecords: DayRecord[]):
  Array<{ meal: "breakfast"|"lunch"|"dinner"; label: string; amount: number; avg: number; share: number }>;

// 单个额外花销分类的明细（降序）+ 该分类日趋势
export function categoryDetail(range: DateRange, category: string, extras: ExtraExpense[]):
  { items: ExtraExpense[]; daily: Array<{date:string; amount:number}>; total:number; count:number };
```

- 区间过滤统一：`expense.date >= start && expense.date <= end`（字符串比较即可，因格式固定）。
- 新建 `src/utils/stats.test.ts`，覆盖：预设区间边界、跨月汇总、分类降序、缺失天补零、占比合计≈100%。

> 如需要新的日期工具（如"本周一"、"上月首尾"），加到 `src/utils/dateUtils.ts` 并用 dayjs 实现，保持周一为一周起点（与 `buildMondayFirstCalendar` 一致）。

### 2.3 统计页结构（新建 `src/components/stats/` 目录）

建议拆分：
- `StatsPage.tsx`（容器：管理 `range` 状态 + `drill` 状态 + 布局）
- `RangeControls.tsx`（区间选择器）
- `OverviewSection.tsx`（总览图表）
- `CategoryBreakdown.tsx`（额外花销分类 + 三餐分类，柱状，可点击下钻）
- `CategoryDetail.tsx`（单分类下钻视图）
- `charts/`：封装好主题的 Recharts 包装组件 `TrendChart.tsx`（面积/折线）、`DonutChart.tsx`、`BarRankChart.tsx`，统一吃 `chartTheme.ts`。

#### A. 区间控制 `RangeControls`
- 预设快捷 chips：`今天 / 昨天 / 前天 / 本周 / 本月 / 上月 / 近30天 / 今年`（点选即设 `range`）。
- 自定义：两个 `<input type="date">`（起、止），校验 `start <= end`，错误用 `.field-error`。
- 当前生效区间用一行小字回显（如 `2026-06-01 → 2026-06-30 · 共 30 天`）。

#### B. 总览 `OverviewSection`（drill 为空时显示）
1. **KPI 卡片行**：总支出 / 日均 / 三餐合计 / 额外花销 / 记账笔数 / 有记录天数。卡片复用极简 metric 样式。其中 **「额外花销」KPI 可点击**，点击 = 直接跳到"额外花销分类"区并高亮（满足需求 2 的"点击额外花销看更细数据"）。
2. **趋势图 `TrendChart`**：X=日期，Y=金额；堆叠面积（三餐 vs 额外）或可切换折线。用 `dailySeries`。`ResponsiveContainer` 自适应。
3. **构成 `DonutChart`**：三餐 vs 额外花销 两段；另一个小环显示早/午/晚构成。中心显示总额。
4. **额外花销分类排行 `BarRankChart`**：用 `extraByCategory`，**降序**横向条形，**点击某条 → 进入该分类下钻**（设置 `drill = {type:"extraCategory", category}`）。
5.（可选）预算燃尽：选中默认预算时画"理想匀速线 vs 实际累计"，复用 `budgetCalculations`。

#### C. 分类维度切换（满足"任意分类都能统计"）
在总览区提供一个**维度切换**（segmented control）：`额外花销分类` / `三餐分类`。
- `额外花销分类`：上面的分类排行，可点击下钻到明细。
- `三餐分类`：用 `mealBreakdown` 画早/午/晚的金额柱 + 占比；点击某一餐 → 进入"三餐分类下钻"（该餐在区间内的逐日趋势 + 均值 + 与动态/固定额度对比，复用 `calculateFixedMealAllowance`、`calculateMealDiff`）。

#### D. 下钻 `CategoryDetail`（drill 非空时显示，顶部有面包屑「统计 / 交通」可返回）
对**额外花销某一分类**（如「交通」）：
- 该分类 **明细列表**：复用并扩展现有 `.expense-list` 样式，**按金额降序**，列出日期 / 金额 / 备注；条目可点击展开看完整备注（或直接显示）。
- 该分类 **日趋势 `TrendChart`**（用 `categoryDetail().daily`）。
- 该分类 **占额外花销/占总支出的比例**（小环或文字）。
- 头部 KPI：该分类总额、笔数、单笔均值、最大单笔。

对**三餐某一餐**：逐日趋势 + 均值 + 节约/超支天数统计。

> 下钻模型用一个 `drill` state：`type Drill = null | { type:"extraCategory"; category:string } | { type:"meal"; meal:MealKey }`。面包屑点击置空返回总览。这样需求里"今天/前天/本月/额外花销分类/某一项明细"都能通过 **区间 × 维度 × 下钻** 三个正交维度组合覆盖。

### 2.4 Recharts 主题化（务必贴合极简风）

在 `charts/*` 包装组件里统一设置，避免默认"科技蓝"：
- 颜色全部取自 `chartTheme.ts`（`categorical` 给分类，语义色给节约/超支）。
- 网格：`<CartesianGrid stroke={CHART.line} vertical={false} />` 或干脆不画；坐标轴 `axisLine={false} tickLine={false}`，刻度文字 `fill: muted`，字体用 `CHART.fontFamily`。
- `Tooltip`：自定义 `content`，白底 + 1px `--line` + 小圆角 + 衬线字体 + `formatCurrency` 格式化数值。
- 柱/环：`radius`(圆角柱)、细 `stroke`；动画克制（`isAnimationActive` 可关或短）。
- 全部包 `ResponsiveContainer`，给定 `height`（如趋势 280、环 240、排行按条数动态）。

### 2.5 空状态与边界
- 区间内无任何记录：显示 `.empty-text` 占位（"该区间还没有记账数据"），不要渲染空图表。
- 分类无明细：同样占位。
- 单日区间（今天/昨天）趋势图退化为单点：可改用当日三餐+额外的柱状/环状而非折线（在 `TrendChart` 里判断 `series.length <= 1` 切换展示）。

---

## 验收标准（Definition of Done）

1. `npm run build` 通过，`npm test` 全绿（含新增 `stats.test.ts`）。
2. 全站字体为 Libre Baskerville + Noto Serif SC；无任何 2px 粗黑边框残留；配色为上述暖灰极简 token。
3. 顶部 `记账 / 统计` 可切换；`记账` 视图保留原有全部功能（记账、月历、当日详情、导入导出），仅样式更新、移除内嵌 MonthlyStats。
4. `统计` 页：
   - 可选区间（预设 chips + 自定义起止日期），区间变化所有图表/数字实时更新。
   - 总览含 KPI、日趋势、构成环、分类排行。
   - 维度可切「额外花销分类 / 三餐分类」。
   - 点击任一额外花销分类 / 任一餐 → 进入下钻视图，含**降序明细**与该分类趋势图；面包屑可返回。
   - 点击「额外花销」KPI 能跳到分类视图。
5. 移动端（<720px）布局不破版，图表自适应宽度。
6. 未改动 Supabase / services / 计算核心的既有行为。

---

## 建议改动文件清单

**改：** `index.html`（字体）、`src/styles/globals.css`（配色/字体/极简化全量调整）、`src/App.tsx`（view 切换、移除 ledger 内 MonthlyStats）、`src/components/Dashboard.tsx`（加 Tab 导航）。
**新增：** `src/styles/chartTheme.ts`、`src/utils/stats.ts`、`src/utils/stats.test.ts`、`src/components/stats/StatsPage.tsx`、`RangeControls.tsx`、`OverviewSection.tsx`、`CategoryBreakdown.tsx`、`CategoryDetail.tsx`、`src/components/stats/charts/{TrendChart,DonutChart,BarRankChart}.tsx`。
**可能新增工具：** 在 `src/utils/dateUtils.ts` 增加周/月区间辅助函数。
**依赖：** `recharts`。
**保留/迁移：** `MonthlyStats.tsx` 的统计逻辑迁入 `stats.ts` + 统计页（旧组件可删或保留为兼容，建议删除引用）。
