"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ShishenAvatar } from "@/components/media";
import { EvaluationBadge } from "@/components/evaluation-badge";
import { RatingRadar } from "@/components/rating-radar";
import { AuthDialog } from "@/components/auth-dialog";
import { factionClass } from "@/lib/faction";
import { cn } from "@/lib/utils";
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

/** 梯队评价排序权重：夯 > 顶级 > 人上人 > NPC > 拉完了 */
const EVAL_ORDER: Record<string, number> = {
  夯: 5,
  顶级: 4,
  人上人: 3,
  NPC: 2,
  拉完了: 1,
};

/** 候选区排序方式 */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "默认顺序" },
  { value: "evaluation", label: "梯队评价" },
  { value: "score", label: "计算和" },
  ...RATING_FIELDS.map((f) => ({ value: String(f.key), label: f.label })),
  { value: "name", label: "名称" },
];

/** 式神候选区每页数量 */
const PAGE_SIZE = 24;

export default function HomePage() {
  const { user } = useAuth();
  const cardMap = useShishenCardMap();
  const options = React.useMemo(() => shishenOptions(cardMap), [cardMap]);

  const [selected, setSelected] = React.useState<Card[]>([]);
  const [keyword, setKeyword] = React.useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [sortKey, setSortKey] = React.useState("default");
  const [factionFilter, setFactionFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

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

  // 移动端「我的卡组」浮层 + 可拖拽浮动按钮
  const [deckOpen, setDeckOpen] = React.useState(false);
  const [floatPos, setFloatPos] = React.useState<{ x: number; y: number } | null>(
    null
  );
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

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

  // 初始化浮动按钮位置（右下角），窗口变化时保持可见
  React.useEffect(() => {
    const place = () =>
      setFloatPos((prev) =>
        prev ?? {
          x: Math.max(12, window.innerWidth - 150),
          y: Math.max(12, window.innerHeight - 120),
        }
      );
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  // 移动端卡组面板打开时锁定页面滚动，避免滚动穿透
  React.useEffect(() => {
    if (!deckOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = body.style.overflow;
    const prevHtml = html.style.overflow;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
    };
  }, [deckOpen]);

  function onFloatPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!floatPos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: floatPos.x,
      originY: floatPos.y,
      moved: false,
    };
  }

  function onFloatPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    const w = e.currentTarget.offsetWidth || 120;
    const h = e.currentTarget.offsetHeight || 48;
    const maxX = Math.max(12, window.innerWidth - w - 12);
    const maxY = Math.max(12, window.innerHeight - h - 12);
    setFloatPos({
      x: Math.min(Math.max(12, d.originX + dx), maxX),
      y: Math.min(Math.max(12, d.originY + dy), maxY),
    });
  }

  function onFloatPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // 未发生拖动则视为点击，打开卡组面板
    if (d && !d.moved) setDeckOpen(true);
  }

  const factions = React.useMemo(
    () => Array.from(new Set(selected.map((s) => s.faction ?? "未知"))),
    [selected]
  );

  // 派系选项（取自式神卡牌数据）
  const factionOptions = React.useMemo(
    () =>
      Array.from(new Set(options.map((s) => s.faction ?? "未知"))).sort((a, b) =>
        a.localeCompare(b, "zh-Hans-CN")
      ),
    [options]
  );

  const filtered = React.useMemo(() => {
    const kw = debouncedKeyword.toLowerCase();
    const picked = new Set(selected.map((s) => s.id));
    const list = options
      .filter((s) => !picked.has(s.id))
      .filter(
        (s) => factionFilter === "all" || (s.faction ?? "未知") === factionFilter
      )
      .filter(
        (s) =>
          !kw ||
          s.name.toLowerCase().includes(kw) ||
          (s.alias ?? []).some((a) => a.toLowerCase().includes(kw))
      );

    if (sortKey === "default") return list;

    const ratingOf = (s: Card) => ratingByRole[String(s.role)];
    const numOf = (s: Card, key: string) => {
      const r = ratingOf(s);
      if (!r) return -1;
      if (key === "score") return scoreSum(r);
      return (r[key as keyof ShishenScore] as number) ?? 0;
    };

    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "zh-Hans-CN");
      if (sortKey === "evaluation") {
        const diff =
          (EVAL_ORDER[ratingOf(b)?.evaluation ?? ""] ?? 0) -
          (EVAL_ORDER[ratingOf(a)?.evaluation ?? ""] ?? 0);
        return diff || numOf(b, "score") - numOf(a, "score");
      }
      return (
        numOf(b, sortKey) - numOf(a, sortKey) ||
        a.name.localeCompare(b.name, "zh-Hans-CN")
      );
    });
  }, [options, selected, debouncedKeyword, sortKey, ratingByRole, factionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const candidates = React.useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // 筛选 / 排序 / 评分系统变化时回到第一页
  React.useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, factionFilter, sortKey, ownerId]);

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
    <div className="mx-auto w-[90vw] py-10">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary sm:px-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span >百闻牌式神卡组评分系统</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          组建你的
          <span className="text-primary">四式神卡组</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          选择 4 位式神（最多 {MAX_FACTIONS} 个派系），参考评分系统查看强度，为你的卡组打分并保存。
        </p>
      </header>

      <div className="grid w-full gap-6 lg:grid-cols-[1fr_360px]">
        {/* 式神选择 */}
        <div>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索式神名称 / 别称"
                className="h-11 rounded-full pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={factionFilter}
                onChange={(e) => setFactionFilter(e.target.value)}
                className="h-11 flex-1 rounded-full sm:w-32 sm:flex-none"
                title="派系筛选"
              >
                <option value="all">全部派系</option>
                {factionOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <Select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="h-11 flex-1 rounded-full sm:w-36 sm:flex-none"
                title="排序方式"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    排序：{o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={ownerId ?? ""}
                onChange={(e) => setOwnerId(Number(e.target.value))}
                className="h-11 flex-1 rounded-full sm:w-40 sm:flex-none"
                title="评分系统"
              >
                {owners.length === 0 && <option value="">暂无评分系统</option>}
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.isDefault ? "默认评分" : o.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group flex flex-col rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <div className="flex items-start gap-3">
                    <ShishenAvatar
                      id={avatarIdOf(s.role, s)}
                      name={s.name}
                      className="h-14 w-14"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-semibold">
                          {s.name}
                        </span>
                        <EvaluationBadge value={rating?.evaluation} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge className={factionClass(s.faction)}>
                          {s.faction ?? "未知"}
                        </Badge>
                        {(s.alias ?? []).slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                      {rating?.note && (
                        <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
                          {rating.note}
                        </p>
                      )}
                    </div>
                    <Plus className="mt-1 h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>

                  {rating ? (
                    <>
                      <div className="mt-3 rounded-xl border border-border/70 bg-secondary/25 px-2 py-1">
                        <RatingRadar
                          rating={rating}
                          className="mx-auto w-full max-w-[236px]"
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          强勾{" "}
                          <b className="text-foreground">
                            {rating.qiang_shi_gou_ci || "—"}
                          </b>
                        </span>
                        <span className="text-muted-foreground">
                          计算和 <b className="text-primary">{scoreSum(rating)}</b>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed py-6 text-center text-[11px] text-muted-foreground">
                      当前评分系统未评分
                    </div>
                  )}
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
                没有符合条件的式神
              </p>
            )}
          </div>

          {/* 分页 */}
          {filtered.length > 0 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={currentPage <= 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一页
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                第 <b className="text-foreground">{currentPage}</b> / {totalPages} 页
                <span className="ml-2 text-xs">共 {filtered.length} 位</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              >
                下一页
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 卡组面板：桌面端为右侧固定栏，移动端弹出为底部浮层 */}
        <aside
          className={cn(
            "lg:sticky lg:top-20 lg:h-fit lg:self-start",
            deckOpen
              ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[95] max-lg:px-3 max-lg:pb-3"
              : "max-lg:hidden"
          )}
        >
          <div className="sakura-card flex flex-col overflow-hidden max-lg:max-h-[80vh] lg:max-h-[calc(100vh-6rem)]">
            {/* 头部（固定） */}
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-secondary/40 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">我的卡组</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {selected.length}/{MAX_DECK}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {selected.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSelected([])}
                  >
                    清空
                  </Button>
                )}
                <button
                  type="button"
                  aria-label="关闭卡组面板"
                  onClick={() => setDeckOpen(false)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="slim-scroll min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-5">
              {/* 四个卡位 */}
              <div className="mb-4 grid grid-cols-4 gap-2">
                {Array.from({ length: MAX_DECK }).map((_, i) => {
                  const s = selected[i];
                  if (!s) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40"
                      >
                        <Plus className="h-4 w-4" />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={s.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-primary/30"
                    >
                      <ShishenAvatar
                        id={avatarIdOf(s.role, s)}
                        name={s.name}
                        className="h-full w-full rounded-xl"
                      />
                      <div className="absolute inset-x-0 bottom-0 truncate bg-slate-900/55 px-1 py-0.5 text-center text-[9px] font-medium text-white">
                        {s.name}
                      </div>
                      <button
                        type="button"
                        aria-label={`移除 ${s.name}`}
                        onClick={() =>
                          setSelected((prev) =>
                            prev.filter((x) => x.id !== s.id)
                          )
                        }
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 已选式神详情 */}
              {selected.length === 0 ? (
                <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                  从左侧选择 {MAX_DECK} 位式神
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selected.map((s) => {
                    const rating = ratingByRole[String(s.role)];
                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-border/70 bg-card p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <ShishenAvatar
                            id={avatarIdOf(s.role, s)}
                            name={s.name}
                            className="h-8 w-8"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                            {s.name}
                          </span>
                          <button
                            type="button"
                            aria-label={`移除 ${s.name}`}
                            onClick={() =>
                              setSelected((prev) =>
                                prev.filter((x) => x.id !== s.id)
                              )
                            }
                            className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <EvaluationBadge value={rating?.evaluation} />
                          <Badge className={factionClass(s.faction)}>
                            {s.faction ?? "未知"}
                          </Badge>
                        </div>

                        {rating ? (
                          <>
                            <div className="mt-1.5 grid grid-cols-3 gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
                              {RATING_FIELDS.map((f) => {
                                const v =
                                  (rating[
                                    f.key as keyof ShishenScore
                                  ] as number) ?? 0;
                                return (
                                  <span key={String(f.key)} className="truncate">
                                    {f.label}
                                    <b className="ml-0.5 text-foreground">
                                      {v > 0 ? v : "–"}
                                    </b>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                              <span className="truncate">
                                强勾{" "}
                                <b className="text-foreground">
                                  {rating.qiang_shi_gou_ci || "—"}
                                </b>
                              </span>
                              <span className="shrink-0">
                                计算和{" "}
                                <b className="text-primary">
                                  {scoreSum(rating)}
                                </b>
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            当前评分系统未评分
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 统计 */}
              {selected.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-secondary/40 px-3 py-2.5">
                    <div className="text-[10px] text-muted-foreground">
                      计算和合计
                    </div>
                    <div className="text-lg font-bold leading-tight text-primary">
                      {totalScore}
                    </div>
                  </div>
                  <div className="rounded-xl bg-secondary/40 px-3 py-2.5">
                    <div className="text-[10px] text-muted-foreground">
                      派系 {factions.length}/{MAX_FACTIONS}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {factions.map((f) => (
                        <Badge key={f} className={factionClass(f)}>
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 保存表单 */}
              <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="deck-name">卡组名称</Label>
                  <Input
                    id="deck-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：红莲快攻"
                    className="h-10 rounded-xl"
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
                    className="h-10 rounded-xl"
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
              </div>
            </div>

            {/* 底部（固定，不参与滚动） */}
            <div className="shrink-0 space-y-2 border-t border-border/70 bg-card px-5 py-3.5">
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

      {/* 移动端：卡组面板遮罩 */}
      {deckOpen && (
        <div
          onClick={() => setDeckOpen(false)}
          className="fixed inset-0 z-[94] bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* 移动端：可拖拽浮动按钮 */}
      {floatPos && (
        <button
          type="button"
          aria-label="我的卡组"
          style={{ left: floatPos.x, top: floatPos.y }}
          onPointerDown={onFloatPointerDown}
          onPointerMove={onFloatPointerMove}
          onPointerUp={onFloatPointerUp}
          className="fixed z-[90] flex touch-none select-none items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 lg:hidden"
        >
          <Layers className="h-4 w-4" />
          我的卡组
          <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[11px]">
            {selected.length}/{MAX_DECK}
          </span>
        </button>
      )}

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
