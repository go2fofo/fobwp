"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import { getCards } from "@/lib/queries";
import { supabase } from "@/lib/supabase/client";
import { CARD_TYPES, FACTIONS, RARITIES, type Card } from "@/lib/types";

const EMPTY: Card = {
  id: 0,
  name: "",
  role: "",
  type: "法术",
  xiyoudu: "",
  stage: "",
  ll: "",
  sm: "",
  desc: "",
  keyword: "",
  faction: "红莲",
  alias: [],
};

export default function AdminCardsPage() {
  const { user } = useAuth();
  // 仅管理员可修改卡牌数据，其他账号只读
  const isAdmin = user?.role === "admin";

  const [list, setList] = React.useState<Card[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");
  const [type, setType] = React.useState("all");
  const [faction, setFaction] = React.useState("all");
  const [xiyoudu, setXiyoudu] = React.useState("all");
  const debounced = useDebouncedValue(keyword);

  const [open, setOpen] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [form, setForm] = React.useState<Card>(EMPTY);
  const [aliasText, setAliasText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    getCards({ keyword: debounced, type, faction, xiyoudu, limit: 200 })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [debounced, type, faction, xiyoudu]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...EMPTY, id: Math.floor(Date.now() / 1000) });
    setAliasText("");
    setIsEdit(false);
    setOpen(true);
  }

  function openEdit(card: Card) {
    setForm(card);
    setAliasText((card.alias ?? []).join(", "));
    setIsEdit(true);
    setOpen(true);
  }

  async function handleSave() {
    if (!isAdmin) {
      alert("仅管理员可以修改卡牌数据");
      return;
    }
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      id: Number(form.id),
      alias: aliasText
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const { error } = isEdit
      ? await supabase.from("cards").update(payload).eq("id", form.id)
      : await supabase.from("cards").insert(payload);
    setSaving(false);
    if (error) {
      alert("保存失败：" + error.message);
      return;
    }
    setOpen(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!isAdmin) {
      alert("仅管理员可以修改卡牌数据");
      return;
    }
    if (!confirm(`确认删除卡牌 #${id}？`)) return;
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) {
      alert("删除失败：" + error.message);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">卡牌数据管理</h1>
          <p className="text-sm text-muted-foreground">
            共 {list.length} 条（最多显示 200 条），支持搜索与增删改。
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新增卡牌
          </Button>
        ) : (
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
            只读模式：仅管理员可修改
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索卡牌名称 / 描述"
            className="pl-9"
          />
        </div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="md:w-36"
        >
          <option value="all">全部类型</option>
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
          className="md:w-36"
        >
          <option value="all">全部派系</option>
          {FACTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Select
          value={xiyoudu}
          onChange={(e) => setXiyoudu(e.target.value)}
          className="md:w-36"
        >
          <option value="all">全部稀有度</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>派系</TableHead>
                <TableHead>稀有度</TableHead>
                <TableHead>勾次</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.type ?? "—"}</TableCell>
                  <TableCell>{c.faction ?? "—"}</TableCell>
                  <TableCell>{c.xiyoudu || "—"}</TableCell>
                  <TableCell>{c.stage || "—"}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑卡牌" : "新增卡牌"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>卡牌 ID</Label>
              <Input
                type="number"
                value={form.id}
                disabled={isEdit}
                onChange={(e) =>
                  setForm({ ...form, id: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>所属式神编号 (role)</Label>
              <Input
                value={form.role ?? ""}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>类型</Label>
              <Select
                value={form.type ?? ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {CARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>派系</Label>
              <Select
                value={form.faction ?? ""}
                onChange={(e) => setForm({ ...form, faction: e.target.value })}
              >
                {FACTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>稀有度</Label>
              <Input
                value={form.xiyoudu ?? ""}
                onChange={(e) =>
                  setForm({ ...form, xiyoudu: e.target.value })
                }
                placeholder="R / SR / SSR"
              />
            </div>
            <div className="space-y-1.5">
              <Label>勾次 (stage)</Label>
              <Input
                value={form.stage ?? ""}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>关键词</Label>
              <Input
                value={form.keyword ?? ""}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                placeholder="逗号分隔"
              />
            </div>
            <div className="space-y-1.5">
              <Label>力量 (ll)</Label>
              <Input
                value={form.ll ?? ""}
                onChange={(e) => setForm({ ...form, ll: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>生命 (sm)</Label>
              <Input
                value={form.sm ?? ""}
                onChange={(e) => setForm({ ...form, sm: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>别称（逗号分隔）</Label>
              <Input
                value={aliasText}
                onChange={(e) => setAliasText(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>描述（#r 换行，#[关键词] 高亮）</Label>
              <Textarea
                value={form.desc ?? ""}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                rows={4}
              />
            </div>
          </div>
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
