"use client";

import * as React from "react";
import { Loader2, Plus, Save, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ShishenAvatar } from "@/components/media";
import { EvaluationBadge } from "@/components/evaluation-badge";
import { AuthDialog } from "@/components/auth-dialog";
import { factionClass } from "@/lib/faction";
import { useShishenCardMap } from "@/hooks/use-shishen-card-map";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import {
  avatarIdOf,
  getDeckRatings,
  getRatingOwners,
  getRatingSystem,
  getUsers,
  shishenOptions,
  userLabel,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase/client";
import {
  MAX_DECK,
  MAX_FACTIONS,
  RATING_FIELDS,
  type AppUser,
  type Card,
  type DeckRating,
  type ShishenScore,
} from "@/lib/types";

/** 六维评分的「计算和」 */
function scoreSum(s: ShishenScore): number {
  return RATING_FIELDS.reduce(
    (acc, f) => acc + ((s[f.key as keyof ShishenScore] as number) ?? 0),
    0
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const cardMap = useShishenCardMap();
  const options = React.useMemo(() => shishenOptions(cardMap), [cardMap]);

  const [selected, setSelected] = React.useState<Card[]>([]);
  const [keyword, setKeyword] = React.useState("");
  const debouncedKeyword = useDebouncedValue(keyword);

  // 评分系统（默认 = 管理员的默认评分）
  const [owners, setOwners] = React.useState<
    { id: number; name: string; isDefault: boolean }[]
  >([]);
  const [ownerId, setOwnerId] = React.useState<number | null>(null);
  const [ratingByRole, setRatingByRole] = React.useState<
    Record<string, ShishenScore>
  >({});

  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [score, setScore] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [authOpen, setAuthOpen] = React.useState(false);
  const [decks, setDecks] = React.useState<DeckRating[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);

  const userById = React.useMemo(() => {
    const m: Record<number, string> = {};
    users.forEach((u) => (m[u.id] = userLabel(u)));
    return m;
  }, [users]);

  React.useEffect(() => {
    getDeckRatings().then(setDecks).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
    getRatingOwners()
      .then((list) => {
        setOwners(list);
        setOwnerId(
          list.find((o) => o.isDefault)?.id ?? list[0]?.id ?? null
        );
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (ownerId == null) {
      setRatingByRole({});
      return;
    }
    getRatingSystem(ownerId)
      .then((list) => {
        const m: Record<string, ShishenScore> = {};
        list.forEach((r) => (m[r.role] = r));
        setRatingByRole(m);
      })
      .catch(() => setRatingByRole({}));
  }, [ownerId]);

  const factions = React.useMemo(
    () => Array.from(new Set(selected.map((s) => s.faction ?? "未知"))),
    [selected]
  );

  const candidates = React.useMemo(() => {
    const kw = debouncedKeyword.toLowerCase();
    const picked = new Set(selected.map((s) => s.id));
    return options
      .filter((s) => !picked.has(s.id))
      .filter(
        (s) =>
          !kw ||
          s.name.toLowerCase().includes(kw) ||
          (s.alias ?? []).some((a) => a.toLowerCase().includes(kw))
      )
      .slice(0, 60);
  }, [options, selected, debouncedKeyword]);

  const totalScore = selected.reduce(
    (sum, s) => {
      const r = ratingByRole[String(s.role)];
      return sum + (r ? scoreSum(r) : 0);
    },
    0
  );

  function addError(s: Card): string | null {
    if (selected.length >= MAX_DECK) return `最多选择 ${MAX_DECK} 位式神`;
    const f = s.faction ?? "未知";
    if (!factions.includes(f) && factions.length >= MAX_FACTIONS) {
      return `最多 ${MAX_FACTIONS} 个派系`;
    }
    return null;
  }

  function add(s: Card) {
    const err = addError(s);
    if (err) {
      setMessage(err);
      return;
    }
    setMessage("");
    setSelected((prev) => [...prev, s]);
  }

  async function handleSave() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!name.trim()) {
      setMessage("请填写卡组名称");
      return;
    }
    if (selected.length !== MAX_DECK) {
      setMessage(`请选择 ${MAX_DECK} 位式神（当前 ${selected.length} 位）`);
      return;
    }
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase
      .from("deck_ratings")
      .insert({
        user_id: user.id,
        user_name: userLabel(user),
        name: name.trim(),
        faction: factions.join(" / "),
        shishen_roles: selected.map((s) => String(s.role)),
        score,
        note: note.trim() || null,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setDecks((prev) => [data as DeckRating, ...prev]);
    setName("");
    setNote("");
    setScore(0);
    setSelected([]);
    setMessage("卡组评分已保存！");
  }

  return (
    <div className="container py-10">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          百闻牌式神卡组评分系统
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          组建你的
          <span className="text-primary">四式神卡组</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          选择 4 位式神（最多 {MAX_FACTIONS} 个派系），参考评分系统查看强度，为你的卡组打分并保存。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* 式神选择 */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索式神名称 / 别称"
                className="h-11 rounded-full pl-10"
              />
            </div>
            <Select
              value={ownerId ?? ""}
              onChange={(e) => setOwnerId(Number(e.target.value))}
              className="h-11 rounded-full sm:w-44"
            >
              {owners.length === 0 && <option value="">暂无评分系统</option>}
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.isDefault ? "默认评分" : o.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {candidates.map((s) => {
              const err = addError(s);
              const rating = ratingByRole[String(s.role)];
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={Boolean(err)}
                  onClick={() => add(s)}
                  title={err ?? undefined}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <ShishenAvatar
                    id={avatarIdOf(s.role, s)}
                    name={s.name}
                    className="h-12 w-12"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {s.name}
                      </span>
                      <EvaluationBadge value={rating?.evaluation} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className={factionClass(s.faction)}>
                        {s.faction ?? "未知"}
                      </Badge>
                      {(s.alias ?? []).map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {a}
                        </span>
                      ))}
                    </div>

                    {rating ? (
                      <div className="mt-2 rounded-lg bg-secondary/50 px-2 py-1.5">
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          {RATING_FIELDS.map((f) => (
                            <span key={String(f.key)}>
                              {f.label}
                              <b className="text-foreground">
                                {(rating[f.key as keyof ShishenScore] as number) ??
                                  0}
                              </b>
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          {rating.qiang_shi_gou_ci && (
                            <span>强勾 {rating.qiang_shi_gou_ci}</span>
                          )}
                          <span className="ml-auto font-bold text-primary">
                            计算和 {scoreSum(rating)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="mt-2 inline-block text-[11px] text-muted-foreground">
                        未评分
                      </span>
                    )}
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
                没有符合条件的式神
              </p>
            )}
          </div>
        </div>

        {/* 卡组面板 */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="sakura-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">
                我的卡组（{selected.length}/{MAX_DECK}）
              </h2>
              {selected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  清空
                </Button>
              )}
            </div>

            <div className="mb-4 space-y-2">
              {selected.length === 0 && (
                <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                  从左侧选择式神
                </p>
              )}
              {selected.map((s) => {
                const rating = ratingByRole[String(s.role)];
                return (
                  <div
                    key={s.id}
                    className="rounded-xl bg-secondary/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <ShishenAvatar
                        id={avatarIdOf(s.role, s)}
                        name={s.name}
                        className="h-8 w-8"
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {s.name}
                      </span>
                      <EvaluationBadge value={rating?.evaluation} />
                      {rating && (
                        <span className="text-xs font-bold text-primary">
                          计算和 {scoreSum(rating)}
                        </span>
                      )}
                      <Badge className={factionClass(s.faction)}>
                        {s.faction ?? "未知"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((prev) =>
                            prev.filter((x) => x.id !== s.id)
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {rating && (
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 pl-10 text-[10px] text-muted-foreground">
                        {RATING_FIELDS.map((f) => (
                          <span key={String(f.key)}>
                            {f.label}{" "}
                            <b className="text-foreground">
                              {(rating[f.key as keyof ShishenScore] as number) ??
                                0}
                            </b>
                          </span>
                        ))}
                        {rating.qiang_shi_gou_ci && (
                          <span>强勾 {rating.qiang_shi_gou_ci}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {factions.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {factions.map((f) => (
                  <Badge key={f} className={factionClass(f)}>
                    {f}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground">
                  派系 {factions.length}/{MAX_FACTIONS}
                </span>
              </div>
            )}

            {selected.length > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">计算和合计</span>
                <span className="font-bold text-primary">{totalScore}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="deck-name">卡组名称</Label>
                <Input
                  id="deck-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：红莲快攻"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deck-score">我的评分（0-20）</Label>
                <Input
                  id="deck-score"
                  type="number"
                  min={0}
                  max={20}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deck-note">备注</Label>
                <Textarea
                  id="deck-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="卡组思路、对局要点……"
                />
              </div>
              {message && (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  {message}
                </p>
              )}
              <Button
                className="w-full rounded-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存卡组评分
              </Button>
              {!user && (
                <p className="text-center text-xs text-muted-foreground">
                  保存需要先登录
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 社区卡组评分 */}
      {decks.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-bold">社区卡组评分</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((d) => (
              <div key={d.id} className="sakura-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="truncate font-semibold">{d.name}</h3>
                  <span className="text-lg font-bold text-primary">
                    {d.score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(d.shishen_roles ?? []).map((role) => {
                    const card = cardMap.byRole[String(role)];
                    return (
                      <div key={role} className="flex flex-col items-center">
                        <ShishenAvatar
                          id={avatarIdOf(role, card)}
                          name={card?.name ?? role}
                          className="h-10 w-10"
                        />
                        <span className="mt-1 w-12 truncate text-center text-[10px] text-muted-foreground">
                          {card?.name ?? role}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {d.faction && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {d.faction}
                  </p>
                )}
                {d.note && (
                  <p className="mt-1 text-sm text-muted-foreground">{d.note}</p>
                )}
                <p className="mt-3 text-right text-xs text-muted-foreground">
                  by{" "}
                  {userById[d.user_id ?? -1] ?? d.user_name ?? "匿名"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
