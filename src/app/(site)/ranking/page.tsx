"use client";

import * as React from "react";
import { Crown, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShishenAvatar } from "@/components/media";
import { EvaluationBadge } from "@/components/evaluation-badge";
import { factionClass } from "@/lib/faction";
import { useShishenCardMap } from "@/hooks/use-shishen-card-map";
import {
  getRatingOwners,
  getRatingSystem,
  resolveRatingCard,
  type RankedShishen,
} from "@/lib/queries";
import { RATING_FIELDS } from "@/lib/types";

export default function RankingPage() {
  const cardMap = useShishenCardMap();

  const [owners, setOwners] = React.useState<
    { id: number; name: string; isDefault: boolean }[]
  >([]);
  const [ownerId, setOwnerId] = React.useState<number | null>(null);
  const [ranked, setRanked] = React.useState<RankedShishen[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getRatingOwners()
      .then((list) => {
        setOwners(list);
        setOwnerId((cur) => {
          if (cur != null && list.some((o) => o.id === cur)) return cur;
          return list.find((o) => o.isDefault)?.id ?? list[0]?.id ?? null;
        });
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (ownerId == null) {
      setRanked([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getRatingSystem(ownerId)
      .then((list) =>
        setRanked(
          list
            .map((r) => resolveRatingCard(cardMap, r))
            .sort((a, b) => b.rating.score - a.rating.score)
        )
      )
      .catch(() => setRanked([]))
      .finally(() => setLoading(false));
  }, [ownerId, cardMap]);

  const currentOwner = owners.find((o) => o.id === ownerId);

  return (
    <div className="container max-w-4xl py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">式神强度榜</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            共 {ranked.length} 位式神，按「{currentOwner?.isDefault ? "默认" : currentOwner?.name ?? "—"}」评分系统的综合评分排名。
          </p>
        </div>
        <Select
          value={ownerId ?? ""}
          onChange={(e) => setOwnerId(Number(e.target.value))}
          className="h-10 w-44 rounded-full"
        >
          {owners.length === 0 && <option value="">暂无评分</option>}
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.isDefault ? "默认" : o.name}
            </option>
          ))}
        </Select>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ranked.length === 0 ? (
        <p className="rounded-2xl border border-dashed py-24 text-center text-sm text-muted-foreground">
          该评分系统暂无数据
        </p>
      ) : (
        <div className="space-y-3">
          {ranked.map((item, i) => {
            const r = item.rating;
            return (
              <div
                key={r.role}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  className={
                    i < 3
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground"
                  }
                >
                  {i < 3 ? <Crown className="h-4 w-4" /> : i + 1}
                </span>

                <ShishenAvatar
                  id={item.avatarId}
                  name={item.name}
                  className="h-11 w-11"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{item.name}</span>
                    <EvaluationBadge value={r.evaluation} />
                    <Badge className={factionClass(item.faction)}>
                      {item.faction}
                    </Badge>
                    {(item.card?.alias ?? []).map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {RATING_FIELDS.map((f) => (
                      <span key={String(f.key)}>
                        {f.label}{" "}
                        <b className="text-foreground">
                          {(r[f.key as keyof typeof r] as number) ?? 0}
                        </b>
                      </span>
                    ))}
                    {r.qiang_shi_gou_ci && (
                      <span>强勾 {r.qiang_shi_gou_ci}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xl font-bold text-primary">
                    {r.score}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
