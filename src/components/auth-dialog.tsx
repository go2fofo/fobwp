"use client";

import * as React from "react";
import { Flower2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { login } = useAuth();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setUsername("");
    setPassword("");
    setNickname("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "操作失败，请重试");
        return;
      }
      login(data.user);
      reset();
      onOpenChange(false);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Flower2 className="h-6 w-6 text-primary" />
          </span>
          <DialogTitle className="text-xl">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "登录后即可保存并管理你的卡组评分"
              : "注册一个账号，开始组建你的卡组"}
          </p>
        </DialogHeader>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={cn(
                "rounded-full py-2 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              className="h-11 rounded-xl"
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称（可选）</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="展示用的昵称"
                className="h-11 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="h-11 rounded-xl"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full rounded-full text-base"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
