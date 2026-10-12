"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { getDeckRatings, getRatingSystem, getStats } from "@/lib/queries";

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [stats, setStats] = React.useState({ cards: 0, ratings: 0, decks: 0 });
  const [mine, setMine] = React.useState({ shishen: 0, decks: 0 });

  React.useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      getStats().then(setStats).catch(() => {});
    } else {
      Promise.all([
        getRatingSystem(user.id).catch(() => []),
        getDeckRatings(user.id).catch(() => []),
      ]).then(([list, decks]) =>
        setMine({ shishen: list.length, decks: decks.length })
      );
    }
  }, [user, isAdmin]);

  /* ------------------------- 管理员视图 ------------------------- */
  if (isAdmin) {
    const items = [
      {
        href: "/admin/cards",
        label: "卡牌数据",
        desc: "卡牌原始数据的查询、增删改",
        value: stats.cards,
        icon: BookOpen,
      },
      {
        href: "/admin/shishen",
        label: "式神评分系统",
        desc: "各用户的式神六维评分",
        value: stats.ratings,
        icon: Users,
      },
      {
        href: "/admin/rating",
        label: "卡组评分",
        desc: "社区卡组评分管理",
        value: stats.decks,
        icon: Layers,
      },
    ];

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Shield className="h-4 w-4" />
            管理员
          </div>
          <h1 className="mt-2 text-2xl font-bold">后台概览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理卡牌原始数据、用户式神评分与社区卡组评分。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="group">
              <Card className="sakura-card h-full rounded-2xl transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50">
                <CardContent className="flex h-full flex-col justify-between gap-5 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <it.icon className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold text-primary">
                      {it.value}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{it.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {it.desc}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      进入管理
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------- 普通用户视图 ------------------------- */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          我的后台
        </div>
        <h1 className="mt-2 text-2xl font-bold">
          你好，{user?.nickname ?? user?.username ?? "旅人"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在这里维护属于你自己的式神评分系统。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/shishen" className="group">
          <Card className="sakura-card h-full rounded-2xl transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">我的式神评分</p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {mine.shishen}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  位式神已评分
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="sakura-card h-full rounded-2xl">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">我保存的卡组评分</p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {mine.decks}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">套卡组</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        卡牌数据与全站评分系统仅管理员可管理，你只能编辑属于自己的式神评分。
      </p>
    </div>
  );
}
