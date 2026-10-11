"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import {
  avatarIdOf,
  getRatingSystems,
  getShishenCardMap,
  getUsers,
  saveRatingSystem,
  shishenOptions,
  userLabel,
  type ShishenCardMap,
} from "@/lib/queries";
import {
  RATING_FIELDS,
  type AppUser,
  type Card,
  type ShishenRatingSystem,
  type ShishenScore,
} from "@/lib/types";

const EMPTY_MAP: ShishenCardMap = { byRole: {}, byId: {} };

/** 对话框草稿：评分条目 + 原始 role（编辑时不可改） */
interface Draft extends ShishenScore {
  isNew: boolean;
}

const EMPTY_DRAFT: Draft = {
  isNew: true,
  role: "",
  name: null,
  faction: null,
  jue_sheng: 0,
  zhan_chang: 0,
  jie_hou: 0,
  guo_pai: 0,
  xing_dong_dian: 0,
  zeng_yi: 0,
  qiang_shi_gou_ci: null,
  note: null,
  score: 0,
  personal_score: null,
  evaluation: null,
};

export default function AdminShishenPage() {
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [cardMap, setCardMap] = React.useState<ShishenCardMap>(EMPTY_MAP);
  const [systems, setSystems] = React.useState<ShishenRatingSystem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<number | null>(null);
  const [keyword, setKeyword] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const options = React.useMemo(() => shishenOptions(cardMap), [cardMap]);
  const current = systems.find((s) => s.user_id === userId);
  const entries = React.useMemo(() => current?.shishen ?? [], [current]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [u, map, sys] = await Promise.all([
      getUsers().catch(() => [] as AppUser[]),
      getShishenCardMap().catch(() => EMPTY_MAP),
      getRatingSystems().catch(() => [] as ShishenRatingSystem[]),
    ]);
    setUsers(u);
    setCardMap(map);
    setSystems(sys);
    setUserId((cur) => {
      if (cur != null && u.some((x) => x.id === cur)) return cur;
      // 优先默认评分（管理员）
      const admin = u.find((x) => x.role === "admin");
      return admin?.id ?? u[0]?.id ?? null;
    });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return entries;
    return entries.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(kw) || r.role.includes(kw)
    );
  }, [entries, keyword]);

  function openCreate() {
    setDraft({ ...EMPTY_DRAFT });
    setError("");
    setOpen(true);
  }

  function openEdit(r: ShishenScore) {
    setDraft({ ...r, isNew: false });
    setError("");
    setOpen(true);
  }

  async function persist(next: ShishenScore[]) {
    if (userId == null) return;
    const msg = await saveRatingSystem(userId, next);
    if (msg) {
      alert("保存失败：" + msg);
      return;
    }
    await load();
  }

  async function handleSave() {
    if (userId == null) return;
    if (!draft.role) {
      setError("请选择式神");
      return;
    }
    const card = options.find((o) => String(o.role) === draft.role);
    const entry: ShishenScore = {
      role: draft.role,
      name: draft.name ?? card?.name ?? null,
      faction: draft.faction ?? card?.faction ?? null,
      jue_sheng: Number(draft.jue_sheng) || 0,
      zhan_chang: Number(draft.zhan_chang) || 0,
      jie_hou: Number(draft.jie_hou) || 0,
      guo_pai: Number(draft.guo_pai) || 0,
      xing_dong_dian: Number(draft.xing_dong_dian) || 0,
      zeng_yi: Number(draft.zeng_yi) || 0,
      qiang_shi_gou_ci: draft.qiang_shi_gou_ci || null,
      note: draft.note || null,
      score: Number(draft.score) || 0,
      personal_score: draft.personal_score,
      evaluation: draft.evaluation || null,
    };
    setSaving(true);
    setError("");
    const others = entries.filter((e) => e.role !== entry.role);
    await persist([...others, entry]);
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(role: string) {
    if (!confirm("确认从该评分系统中删除这条式神评分？")) return;
    await persist(entries.filter((e) => e.role !== role));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">式神评分管理</h1>
          <p className="text-sm text-muted-foreground">
            管理各用户的式神评分系统（当前共 {entries.length} 位式神）。
          </p>
        </div>
        <Button onClick={openCreate} disabled={userId == null}>
          <Plus className="mr-2 h-4 w-4" />
          新增式神评分
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <Select
          value={userId ?? ""}
          onChange={(e) => setUserId(Number(e.target.value))}
          className="md:w-56"
        >
          {users.length === 0 && <option value="">暂无用户</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userLabel(u)}
            </option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索式神名称"
            className="pl-9"
          />
        </div>
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
                <TableHead>式神</TableHead>
                <TableHead className="text-center">综合分</TableHead>
                <TableHead>梯队</TableHead>
                <TableHead>强势勾次</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((r) => {
                  const card = cardMap.byRole[r.role];
                  return (
                    <TableRow key={r.role}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShishenAvatar
                            id={avatarIdOf(r.role, card)}
                            name={r.name ?? r.role}
                            className="h-8 w-8"
                          />
                          <span className="font-medium">
                            {r.name ?? card?.name ?? r.role}
                          </span>
                          <Badge
                            className={factionClass(r.faction ?? card?.faction)}
                          >
                            {r.faction ?? card?.faction ?? "未知"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {r.score}
                      </TableCell>
                      <TableCell>{r.evaluation || "—"}</TableCell>
                      <TableCell>{r.qiang_shi_gou_ci || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.role)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    该用户暂无式神评分
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {draft.isNew ? "新增式神评分" : "编辑式神评分"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>式神（仅式神卡）</Label>
              <Select
                value={draft.role}
                disabled={!draft.isNew}
                onChange={(e) => {
                  const card: Card | undefined = options.find(
                    (o) => String(o.role) === e.target.value
                  );
                  setDraft({
                    ...draft,
                    role: e.target.value,
                    name: card?.name ?? null,
                    faction: card?.faction ?? null,
                  });
                }}
              >
                <option value="">请选择式神</option>
                {options.map((o) => (
                  <option key={o.id} value={String(o.role)}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>

            {RATING_FIELDS.map((f) => (
              <div key={String(f.key)} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type="number"
                  value={(draft[f.key as keyof Draft] as number) ?? 0}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [f.key]: Number(e.target.value),
                    } as Draft)
                  }
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>综合分</Label>
              <Input
                type="number"
                value={draft.score}
                onChange={(e) =>
                  setDraft({ ...draft, score: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>个人分</Label>
              <Input
                type="number"
                value={draft.personal_score ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    personal_score: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>梯队评价</Label>
              <Input
                value={draft.evaluation ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, evaluation: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>强势勾次</Label>
              <Input
                value={draft.qiang_shi_gou_ci ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, qiang_shi_gou_ci: e.target.value })
                }
                placeholder="如：2 3勾"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Textarea
                value={draft.note ?? ""}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                rows={2}
              />
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
