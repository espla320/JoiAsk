"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountUser, loginAccount, registerAccount } from "@/lib/api";

interface AccountDialogProps {
  open: boolean;
  initialMode: "login" | "register";
  onClose: () => void;
  onAuthenticated: (user: AccountUser) => void;
}

export function AccountDialog({
  open,
  initialMode,
  onClose,
  onAuthenticated,
}: AccountDialogProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setError("");
      setBusy(false);
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await loginAccount(username, password);
      if (response.code === 200) onAuthenticated(response.data);
      else setError(response.message || "登录失败");
    } catch {
      setError("登录失败，请检查网络连接");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await registerAccount(username, password);
      if (response.code === 200) onAuthenticated(response.data);
      else setError(response.message || "注册失败");
    } catch {
      setError("注册失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 px-4 py-8"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-md border-2 border-dashed border-[var(--fabric-stitch)] bg-card p-5 text-foreground shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex rounded-md bg-secondary p-1">
            <button
              className={`rounded px-4 py-1.5 text-sm ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              登录
            </button>
            <button
              className={`rounded px-4 py-1.5 text-sm ${mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              注册
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded hover:bg-secondary"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "login" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="mb-1.5 block text-sm">登录名</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "登录"}
            </Button>
            <p className="text-xs text-muted-foreground">
              还没有账号？切到「注册」用登录名和密码创建即可，不需要 B 站验证。
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="mb-1.5 block text-sm">登录名</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={32}
                autoComplete="username"
                placeholder="2 至 32 个字符，不能包含空格"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm">设置密码</label>
              <Input
                type="password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm">确认密码</label>
              <Input
                type="password"
                minLength={8}
                maxLength={72}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "注册并登录"}
            </Button>
            <p className="text-xs text-muted-foreground">
              注册后可以在「我的资料」里设置展示 ID 和头像，投稿时勾选实名就会显示在提问下方。
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
