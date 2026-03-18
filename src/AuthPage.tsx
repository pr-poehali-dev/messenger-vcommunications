import { useState } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/3c0a32d6-c17c-47f4-a846-fb1c453c24fc";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 1200): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 10000);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (err) {
    clearTimeout(tid);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  } finally {
    clearTimeout(tid);
  }
}

type Mode = "login" | "register";

interface AuthUser {
  id: number;
  phone: string;
  username: string;
}

interface AuthPageProps {
  onAuth: (user: AuthUser, token: string) => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetchWithRetry(`${AUTH_URL}?action=register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, username, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Ошибка регистрации"); return; }
        localStorage.setItem("auth_token", data.token);
        onAuth(data.user, data.token);
      } else {
        const res = await fetchWithRetry(`${AUTH_URL}?action=login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Ошибка входа"); return; }
        localStorage.setItem("auth_token", data.token);
        onAuth(data.user, data.token);
      }
    } catch {
      setError("Нет соединения с сервером — попробуй ещё раз");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
            <Icon name="MessageCircle" size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nova</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Войдите в аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <div className="glass-strong border border-border/60 rounded-2xl p-6 shadow-xl">
          <div className="flex bg-muted/40 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Вход
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Номер телефона</label>
                  <div className="relative">
                    <Icon name="Phone" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+7 900 000 00 00"
                      required
                      className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Юзернейм</label>
                  <div className="relative">
                    <Icon name="AtSign" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="username"
                      required
                      className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Телефон или юзернейм</label>
                <div className="relative">
                  <Icon name="User" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    placeholder="+79001234567 или username"
                    required
                    className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Пароль</label>
              <div className="relative">
                <Icon name="Lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Минимум 6 символов" : "Пароль"}
                  required
                  className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <Icon name="CircleAlert" size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  {mode === "login" ? "Вхожу..." : "Регистрирую..."}
                </>
              ) : (
                mode === "login" ? "Войти" : "Зарегистрироваться"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}