# 支付与订单导入

登录后在页面底部“支付与订单导入”中选择 Dating 的 `记账待核对.json`。文件只在浏览器内预览，未选择的记录不会入账。核对日期及重复来源、选择入账类别后，才调用数据库写入。

支持早餐、午餐、晚餐增量、额外支出、退款冲减、关联已有流水及已手工记录的额外支出。相同金额不自动认作同一交易。订单列表只可补充已记支出或先与扣款通知合并；先享后付需核对真实扣款日。收入、转账、未确认状态、外币和零元记录不增加支出。

财务来源身份和原始必要字段保存于 `finance_postings` / `finance_keys`，按用户启用 RLS。`import_finance_batch` 在同一事务内验证并写入；重复身份不再记账、失败回滚整批、累计退款不能超过原支出。人工合并保留所有来源，关联已有支出时也保留新增来源。

正式消息、订单快照、真实账号、导出包、登录凭据均不放入本公开仓库。测试使用合成数据。

普通 JSON 备份尚不包含财务来源索引，退款也应通过财务流程重建。请同时保留 Dating 的来源文件及财务数据库；跨账号搬迁财务历史尚未实现。

验证：`npm test`、`npm run build`。数据库事务测试见 `supabase/tests/finance_import.sql`，需管理连接和已有测试用户，最终回滚，不留测试金额。2026-10-08 已在项目数据库以 authenticated 角色通过首次导入、重复导入、来源关联、餐费增量、手工记录关联、退款上限、整批回滚、订单证据限制及用户隔离验证。

数据库安全检查未报新增财务表问题；已有的 `rls_auto_enable` 函数执行权限及密码泄漏保护设置提示未在本次任务修改。详情：[函数权限检查](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)、[密码泄漏保护](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。
