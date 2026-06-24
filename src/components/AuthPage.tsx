import { LockKeyhole, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { signInWithEmail, signUpWithEmail } from "../services/authService";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const result = mode === "login" ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
    setLoading(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(mode === "login" ? "登录成功，正在进入。" : "注册完成，请根据 Supabase Auth 设置确认邮箱后登录。");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <LockKeyhole size={30} />
        </div>
        <h1>生活费预算记账</h1>
        <p>记录三餐和额外花销，按多档生活费预算自动计算节约与超支。</p>
        {!isSupabaseConfigured ? (
          <div className="setup-warning">
            <strong>需要先配置 Supabase。</strong>
            <span>请复制 `.env.example` 为 `.env.local`，填入 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              邮箱
              <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              密码
              <input
                value={password}
                type="password"
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {message && <p className="form-message">{message}</p>}
            <button type="submit" className="primary-button" disabled={loading}>
              <LogIn size={18} />
              {loading ? "处理中" : mode === "login" ? "登录" : "注册"}
            </button>
            <button type="button" className="text-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "没有账号，去注册" : "已有账号，去登录"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
