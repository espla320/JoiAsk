"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createMember,
  deleteMember,
  getMembers,
  Member,
  resetMemberPassword,
  updateMemberStatus,
} from "@/lib/api";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

export default function MembersPage() {
  const [users, setUsers] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    display_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getMembers(page, PAGE_SIZE);
      if (response.code === 200) {
        setUsers(response.data.users || []);
        setTotal(response.data.total);
      } else setError(response.message || "读取失败");
    } catch {
      setError("读取失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (user: Member) => {
    const response = await updateMemberStatus(
      user.bilibili_uid,
      !user.is_disabled,
    );
    if (response.code === 200) load();
    else setError(response.message || "更新失败");
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAdd = () => {
    setAddForm({ username: "", password: "", display_id: "" });
    setError("");
    setAddOpen(true);
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const username = addForm.username.trim();
    if (username.length < 2 || username.length > 32 || /\s/.test(username)) {
      setError("登录名需为 2 至 32 个字符且不能包含空格");
      return;
    }
    if (
      addForm.password.length < 8 ||
      new TextEncoder().encode(addForm.password).length > 72
    ) {
      setError("密码长度需为 8 至 72 个字符");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await createMember({
        username,
        password: addForm.password,
        display_id: addForm.display_id.trim(),
      });
      if (response.code !== 200) {
        setError(response.message || "添加失败");
        return;
      }
      setAddOpen(false);
      if (page === 1) await load();
      else setPage(1);
    } catch {
      setError("添加失败，请检查网络连接");
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await deleteMember(deleteTarget.bilibili_uid);
    setDeleting(false);
    if (response.code === 200) {
      setDeleteTarget(null);
      if (users.length === 1 && page > 1) setPage((value) => value - 1);
      else load();
    } else setError(response.message || "删除失败");
  };

  const openResetPassword = (user: Member) => {
    setNewPassword("");
    setError("");
    setPasswordTarget(user);
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTarget) return;
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setError("密码长度需为 8 至 72 个字符");
      return;
    }
    setResetting(true);
    setError("");
    const response = await resetMemberPassword(passwordTarget.bilibili_uid, newPassword);
    setResetting(false);
    if (response.code === 200) {
      setPasswordTarget(null);
      setNewPassword("");
    } else {
      setError(response.message || "重置失败");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">注册用户</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理平台注册账号，可以禁用、重置密码或删除
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          手动添加
        </Button>
      </header>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户</TableHead>
            <TableHead>展示 ID</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                加载中...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                暂无注册用户
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.bilibili_uid}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 shrink-0 rounded-full bg-muted bg-cover bg-center"
                      style={
                        user.bilibili_avatar
                          ? { backgroundImage: `url(${user.bilibili_avatar})` }
                          : undefined
                      }
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {user.bilibili_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        登录名：{user.username}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.display_id || "-"}</TableCell>
                <TableCell className="text-sm">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell>
                  {user.is_disabled ? (
                    <span className="text-destructive">已禁用</span>
                  ) : (
                    <span className="text-green-700">正常</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggle(user)}
                    >
                      {user.is_disabled ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Ban className="mr-2 h-4 w-4" />
                      )}
                      {user.is_disabled ? "启用" : "禁用"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPassword(user)}
                      title="重置密码"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(user)}
                      title="删除用户"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-3 text-sm">
        <span>
          第 {page} / {pages} 页，共 {total} 人
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!creating) setAddOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={add}>
            <DialogHeader>
              <DialogTitle>手动添加注册用户</DialogTitle>
              <DialogDescription>
                无需关注验证，直接创建可登录的平台账号。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="member-display-id">展示 ID</Label>
                <Input
                  id="member-display-id"
                  value={addForm.display_id}
                  onChange={(event) =>
                    setAddForm({ ...addForm, display_id: event.target.value })
                  }
                  maxLength={32}
                  placeholder="可留空，用户之后可以自己设置"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-username">登录名</Label>
                <Input
                  id="member-username"
                  value={addForm.username}
                  onChange={(event) =>
                    setAddForm({ ...addForm, username: event.target.value })
                  }
                  minLength={2}
                  maxLength={32}
                  autoComplete="off"
                  placeholder="请输入登录名"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-password">密码</Label>
                <Input
                  id="member-password"
                  type="password"
                  value={addForm.password}
                  onChange={(event) =>
                    setAddForm({ ...addForm, password: event.target.value })
                  }
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="请输入密码"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => setAddOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "添加中..." : "确认添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => {
          if (!open && !resetting) setPasswordTarget(null);
        }}
      >
        <DialogContent>
          <form onSubmit={resetPassword}>
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
              <DialogDescription>
                为 {passwordTarget?.bilibili_name || passwordTarget?.username} 设置一个新的登录密码，设置后请告知对方。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-5">
              <Label htmlFor="member-new-password">新密码</Label>
              <Input
                id="member-new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                autoComplete="off"
                placeholder="8 至 72 个字符"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={resetting}
                onClick={() => setPasswordTarget(null)}
              >
                取消
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? "保存中..." : "确认重置"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除注册用户</DialogTitle>
            <DialogDescription>
              将删除 {deleteTarget?.bilibili_name || deleteTarget?.username}{" "}
              的平台账号。历史投稿会保留作者信息，但该账号将无法再登录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={remove}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
