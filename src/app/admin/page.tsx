"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Layers, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getStats } from "@/lib/queries";

export default function AdminDashboard() {
  const [stats, setStats] = React.useState({ cards: 0, ratings: 0, decks: 0 });

  React.useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const items = [
    { href: "/admin/cards", label: "卡牌数据", value: stats.cards, icon: BookOpen },
    { href: "/admin/shishen", label: "评分系统", value: stats.ratings, icon: Users },
    { href: "/admin/rating", label: "卡组评分", value: stats.decks, icon: Layers },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">后台概览</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        管理卡牌原始数据、用户式神评分与卡组评分。
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card className="rounded-2xl transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{it.label}</p>
                  <p className="mt-1 text-3xl font-bold text-primary">
                    {it.value}
                  </p>
                </div>
                <it.icon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
