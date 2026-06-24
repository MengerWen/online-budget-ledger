# 生活费预算记账 Web App

一个在线优先的个人生活费预算记账 App：React + TypeScript + Vite 前端，Supabase 负责登录、Postgres 数据库和 RLS，支持 PWA 添加到主屏幕。

## 本地运行

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local`，填入：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Supabase 配置

1. 新建 Supabase project。
2. 在 SQL Editor 中运行 `supabase/migrations/001_init.sql`。
3. 在 Authentication 中启用 Email + Password 登录。
4. 从 Project Settings / API 复制 Project URL 与 anon public key 到 `.env.local`。
5. 不要把 service role key 放进前端环境变量。

SQL migration 已创建 `budgets`、`day_records`、`extra_expenses`、`app_settings`，并为四张表启用 Row Level Security。所有 select / insert / update / delete policy 都按 `auth.uid() = user_id` 隔离用户数据。

## 构建与预览

```bash
npm run build
npm run preview
```

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 在 Vercel 导入该仓库。
3. 设置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
4. Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
5. 部署完成后，Vercel 项目页会显示 Production URL。

## 主要功能

- 邮箱密码登录、退出登录。
- 新用户首次进入自动创建 2000 / 3000 / 4000 三档预算。
- 多档预算并行展示：今日差额、本月至今差额、剩余余额、剩余日均和使用率。
- 周一开头月历，显示公历、农历、周末、三餐记录状态、额外花销和预算差额筛选。
- 每日三餐独立输入，空值表示未记录，0 元合法。
- 额外花销新增和删除，计入当天和月度总额。
- 月度统计、分类汇总、JSON 导出与合并导入。
- PWA manifest 与 service worker，离线时允许查看缓存但禁止假装保存成功。

## 已知限制

- 当前版本实现在线优先；离线写入队列和冲突处理未实现。
- 默认预算历史冻结采用当前默认预算作为展示锚点，未单独建 default budget history 表。
- Vercel 生产 URL 需要你在自己的 Vercel 项目中部署后获得。
