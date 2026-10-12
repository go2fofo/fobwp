"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  Layers,
  Loader2,
  Shield,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "概览", icon: Home },
  { href: "/admin/cards", label: "卡牌数据管理", icon: BookOpen },
  { href: "/admin/shishen", label: "式神评分管理", icon: Users },
  { href: "/admin/rating", label: "卡组评分管理", icon: Layers },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = user?.role === "admin";
  // 普通用户仅可进入「概览」与「式神评分管理」
  const canAccess =
    isAdmin ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/shishen");

  React.useEffect(() => {
    if (
      !loading &&
      user &&
      !isAdmin &&
      pathname !== "/admin" &&
      !pathname.startsWith("/admin/shishen")
    ) {
      router.replace("/admin");
    }
  }, [loading, user, isAdmin, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">需要登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            请先登录后再进入后台管理。
          </p>
        </div>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nav = isAdmin
    ? NAV
    : NAV.filter(
        (i) => i.href === "/admin" || i.href === "/admin/shishen"
      );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="slim-scroll hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/60 p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 py-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">后台管理</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回前台
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border p-3 md:hidden">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <main className="slim-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6">{children}</main>
      </div>
    </div>
  );
}
