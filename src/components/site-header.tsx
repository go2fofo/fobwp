/*
 * @Author: whq
 * @Date: 2026-10-11 14:21:50
 * @LastEditTime: 2026-10-12 20:22:41
 * @LastEditors: whq
 * @Description: 
 * @FilePath: \fobwp\src\components\site-header.tsx
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flower2, LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/ranking", label: "式神强度榜" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hidden sm:inline">
            <Flower2 className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-wide">百闻牌评分</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <Shield className="mr-1.5 h-4 w-4" />
                后台
              </Link>
            </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <User className="h-4 w-4" />
                {user.nickname ?? user.username}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-1.5 h-4 w-4" />
                退出
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)}>
              登录 / 注册
            </Button>
          )}
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
