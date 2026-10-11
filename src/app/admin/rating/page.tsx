"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShishenAvatar } from "@/components/media";
import { factionClass } from "@/lib/faction";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  avatarIdOf,
  getDeckRatings,
  getShishenCardMap,
  getUsers,
  shishenOptions,
  userLabel,
  type ShishenCardMap,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase/client";
import {
  MAX_DECK,
  MAX_FACTIONS,
  type AppUser,
  type Card,
  type DeckRating,
} from "@/lib/types";

const EMPTY_MAP: ShishenCardMap = { byRole: {}, byId: {} };

interface Draft {
  id: number | null;
  user_id: number | null;
  name: string;
  score: number;
  note: string;
}

const EMPTY_DRAFT: Draft = { id: null, user_id: null, name: "", score: 0, note: "" };

export default function AdminRatingPage() {
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [cardMap, setCardMap] = React.useState<ShishenCardMap>(EMPTY_MAP);
  const [decks, setDecks] = React.useState<DeckRating[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userFilter, setUserFilter] = React.useState("all");

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [selected, setSelected] = React.useState<Card[]>([]);
  const [keyword, setKeyword] = React.useState("");
  const debounced = useDebouncedValue(keyword);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const options = React.useMemo(() => shishenOptions(cardMap), [cardMap]);
  const userMap = React.useMemo(() => {
    const m: Record<number, string> = {};
    users.forEach((u) => (m[u.id] = userLabel(u)));
    return m;
  }, [users]);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      getUsers().catch(() => [] as AppUser[]),
      getShishenCardMap().catch(() => EMPTY_MAP),
      getDeckRatings().catch(() => [] as DeckRating[]),
    ])
      .then(([u, map, d]) => {
        setUsers(u);
        setCardMap(map);
        setDecks(d);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(
    () =>
      decks.filter((d) =>
        userFilter === "all" ? true : String(d.user_id) === userFilter
      ),
    [decks, userFilter]
  );

  const factions = React.useMemo(
    () => Array.from(new Set(selected.map((s) => s.faction ?? "未知"))),
    [selected]
  );

  const candidates = React.useMemo(() => {
    const kw = debounced.toLowerCase();
    const picked = new Set(selected.map((s) => s.id));
    return options
      .filter((o) => !picked.has(o.id))
      .filter((o) => !kw || o.name.toLowerCase().includes(kw))
      .slice(0, 100);
  }, [options, selected, debounced]);

  function addError(c: Card): string | null {
    if (selected.length >= MAX_DECK) return `最多 ${MAX_DECK} 位式神`;
    const f = c.faction ?? "未知";
    if (!factions.includes(f) && factions.length >= MAX_FACTIONS) {
      return `最多 ${MAX_FACTIONS} 个派系`;
    }
    return null;
  }

  function openCreate() {
    setDraft({ ...EMPTY_DRAFT, user_id: users[0]?.id ?? null });
    setSelected([]);
    setKeyword("");
    setError("");
    setOpen(true);
  }

  function openEdit(d: DeckRating) {
    setDraft({
      id: d.id,
      user_id: d.user_id,
      name: d.name,
      score: d.score,
      note: d.note ?? "",
    });
    setSelected(
      (d.shishen_roles ?? [])
        .map((role) => options.find((o) => String(o.role) === String(role)))
        .filter((c): c is Card => Boolean(c))
    );
    setKeyword("");
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.user_id) {
      setError("请选择所属用户");
      return;
    }
    if (!draft.name.trim()) {
      setError("请填写卡组名称");
      return;
    }
    if (selected.length !== MAX_DECK) {
      setError(`请选择 ${MAX_DECK} 位式神（当前 ${selected.length} 位）`);
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      user_id: draft.user_id,
      user_name: userMap[draft.user_id] ?? null,
      name: draft.name.trim(),
      faction: factions.join(" / "),
      shishen_roles: selected.map((s) => String(s.role)),
      score: Number(draft.score) || 0,
      note: draft.note || null,
      updated_at: new Date().toISOString(),
    };
    const { error: dbError } = draft.id
      ? await supabase.from("deck_ratings").update(payload).eq("id", draft.id)
      : await supabase.from("deck_ratings").insert(payload);
    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setOpen(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm(`确认删除卡组 #${id}？`)) return;
    const { error: dbError } = await supabase
      .from("deck_ratings")
      .delete()
      .eq("id", id);
    if (dbError) {
      alert("删除失败：" + dbError.message);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">卡组评分管理</h1>
          <p className="text-sm text-muted-foreground">
            共 {filtered.length} 套卡组评分。选择 {MAX_DECK} 位式神（最多 {MAX_FACTIONS} 个派系）。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新增卡组评分
        </Button>
      </div>

      <div className="mb-4 max-w-xs">
        <Select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option value="all">全部用户</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userLabel(u)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>卡组名称</TableHead>
                <TableHead>所属用户</TableHead>
                <TableHead>派系</TableHead>
                <TableHead>式神</TableHead>
                <TableHead className="text-center">评分</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.user_name ?? userMap[d.user_id ?? -1] ?? "—"}
                  </TableCell>
                  <TableCell>{d.faction || "—"}</TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {(d.shishen_roles ?? []).map((role) => {
                        const card = cardMap.byRole[String(role)];
                        return (
                          <ShishenAvatar
                            key={role}
                            id={avatarIdOf(String(role), card)}
                            name={card?.name ?? String(role)}
                            className="h-8 w-8 ring-2 ring-card"
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    {d.score}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(d)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "编辑卡组评分" : "新增卡组评分"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>所属用户</Label>
                <Select
                  value={draft.user_id ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, user_id: Number(e.target.value) })
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>卡组名称</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>评分</Label>
                <Input
                  type="number"
                  value={draft.score}
                  onChange={(e) =>
                    setDraft({ ...draft, score: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>备注</Label>
                <Textarea
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>
                    已选式神（{selected.length}/{MAX_DECK}）
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    派系 {factions.length}/{MAX_FACTIONS}
                  </span>
                </div>
                <div className="space-y-2">
                  {selected.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-md bg-secondary/60 px-2 py-1.5"
                    >
                      <ShishenAvatar
                        id={avatarIdOf(s.role, s)}
                        name={s.name}
                        className="h-7 w-7"
                      />
                      <span className="flex-1 truncate text-sm">{s.name}</span>
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
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索式神"
                  className="pl-9"
                />
              </div>
              <div className="h-[320px] space-y-1 overflow-y-auto rounded-md border p-1">
                {candidates.map((s) => {
                  const err = addError(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={Boolean(err)}
                      onClick={() => {
                        setError("");
                        setSelected((prev) => [...prev, s]);
                      }}
                      title={err ?? undefined}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShishenAvatar
                        id={avatarIdOf(s.role, s)}
                        name={s.name}
                        className="h-8 w-8"
                      />
                      <span className="flex-1 truncate text-sm">{s.name}</span>
                      <Badge className={factionClass(s.faction)}>
                        {s.faction ?? "未知"}
                      </Badge>
                    </button>
                  );
                })}
                {candidates.length === 0 && (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    没有可选的式神
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
