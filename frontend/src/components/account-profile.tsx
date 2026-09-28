"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Settings, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeAccountPassword, updateAccountProfile, uploadAccountAvatar } from "@/lib/api";
import { useAccountAuth } from "@/lib/account-auth";

export function AccountProfile() {
  const { user, setUser } = useAccountAuth();
  const [open, setOpen] = useState(false);
  const [displayId, setDisplayId] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayId(user?.display_id ?? "");
    setAvatarFile(null);
    setError("");
    setMessage("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordMessage("");
    if (fileRef.current) fileRef.current.value = "";
  }, [open, user]);

  useEffect(() => {
    if (!avatarFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!user) return null;

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (avatarFile) {
        const uploaded = await uploadAccountAvatar(avatarFile);
        if (uploaded.code !== 200) {
          setError(uploaded.message || "头像上传失败");
          return;
        }
        setUser(uploaded.data);
        setAvatarFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
      const updated = await updateAccountProfile(displayId.trim());
      if (updated.code === 200) {
        setUser(updated.data);
        setMessage("已保存");
      } else {
        setError(updated.message || "保存失败");
      }
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const avatarSrc = preview || user.bilibili_avatar;
  const trimmedDisplayId = displayId.trim();
  const isNumericDisplayId = /^\d+$/.test(trimmedDisplayId);
  const previewName = user.bilibili_name || user.username;

  const submitPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      const response = await changeAccountPassword(oldPassword, newPassword);
      if (response.code === 200) {
        setPasswordMessage("密码已更新");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(response.message || "修改失败");
      }
    } catch {
      setPasswordError("修改失败，请稍后重试");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-primary-foreground hover:bg-white/10"
        title="我的资料"
        aria-label="我的资料"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[460px] rounded-md border-2 border-dashed border-[var(--fabric-stitch)] bg-card p-5 text-foreground shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base">我的资料</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded hover:bg-secondary"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-[var(--fabric-stitch)] bg-secondary">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      无头像
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    选择头像
                  </Button>
                  <p className="text-xs text-muted-foreground">支持常见图片格式，最大 5 MB。</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm">展示 ID</label>
                <Input
                  value={displayId}
                  onChange={(event) => setDisplayId(event.target.value)}
                  maxLength={32}
                  placeholder="例如你的 B 站 UID 或昵称，可留空"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  只会在你勾选「实名投稿」的提问下方显示。已发布的提问不会回溯更新。
                </p>
              </div>

              <div className="rounded-md border border-dashed border-[var(--fabric-stitch)] bg-secondary/40 px-3 py-2.5">
                <p className="mb-2 text-xs text-muted-foreground">提问下方会这样显示</p>
                <div className="inline-flex items-center gap-2 text-sm">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-muted" />
                  )}
                  {isNumericDisplayId ? (
                    <a
                      href={`https://space.bilibili.com/${trimmedDisplayId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {previewName}
                    </a>
                  ) : (
                    <span className="text-primary">{previewName}</span>
                  )}
                  {trimmedDisplayId && (
                    <span className="text-xs text-muted-foreground">（ID {trimmedDisplayId}）</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isNumericDisplayId
                    ? `纯数字 ID 会自动链接到 B 站空间：space.bilibili.com/${trimmedDisplayId}`
                    : "当前 ID 不是纯数字，会按普通文本显示；填成 B 站 UID（纯数字）就会自动变成空间链接。"}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">登录名：{user.username}</div>

              <div className="space-y-3 border-t border-dashed border-[var(--fabric-stitch)] pt-4">
                <p className="text-sm">修改密码</p>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="当前密码"
                />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="新密码（8 至 72 个字符）"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="确认新密码"
                />
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                {passwordMessage && <p className="text-sm text-green-700">{passwordMessage}</p>}
                <Button
                  variant="outline"
                  type="button"
                  onClick={submitPasswordChange}
                  disabled={passwordBusy || !oldPassword || !newPassword || !confirmPassword}
                >
                  {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "修改密码"}
                </Button>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-green-700">{message}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  关闭
                </Button>
                <Button type="button" onClick={save} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
