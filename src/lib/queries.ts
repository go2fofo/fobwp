import { supabase } from "./supabase/client";
import type {
  AppUser,
  Card,
  DeckRating,
  ShishenRatingSystem,
  ShishenScore,
} from "./types";

/** 获取全站统计数量 */
export async function getStats() {
  const [cards, ratings, decks] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true }),
    supabase
      .from("shishen_ratings")
      .select("id", { count: "exact", head: true }),
    supabase.from("deck_ratings").select("id", { count: "exact", head: true }),
  ]);
  return {
    cards: cards.count ?? 0,
    ratings: ratings.count ?? 0,
    decks: decks.count ?? 0,
  };
}

/* ------------------------- 卡牌 ------------------------- */

/** 卡牌查询参数 */
export interface CardQuery {
  keyword?: string;
  type?: string;
  faction?: string;
  xiyoudu?: string;
  limit?: number;
}

/** 查询卡牌（支持关键词/类型/派系/稀有度过滤） */
export async function getCards(query: CardQuery = {}): Promise<Card[]> {
  const { keyword, type, faction, xiyoudu, limit = 120 } = query;
  let builder = supabase
    .from("cards")
    .select("*")
    .order("id", { ascending: true });

  if (keyword) {
    const like = `%${keyword}%`;
    builder = builder.or(
      `name.ilike.${like},"desc".ilike.${like},keyword.ilike.${like}`
    );
  }
  if (type && type !== "all") builder = builder.eq("type", type);
  if (faction && faction !== "all") builder = builder.eq("faction", faction);
  if (xiyoudu && xiyoudu !== "all") builder = builder.eq("xiyoudu", xiyoudu);

  const { data, error } = await builder.limit(limit);
  if (error) throw error;
  return (data ?? []) as Card[];
}

/** 式神卡牌映射：按 role 与按 id 两个索引（值为 cards 中的式神卡） */
export interface ShishenCardMap {
  byRole: Record<string, Card>;
  byId: Record<string, Card>;
}

/** 查询 cards 中所有「式神」类卡牌，建立 role / id 索引 */
export async function getShishenCardMap(): Promise<ShishenCardMap> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("type", "式神");
  if (error) throw error;
  const byRole: Record<string, Card> = {};
  const byId: Record<string, Card> = {};
  for (const row of (data ?? []) as Card[]) {
    if (row.role != null) byRole[String(row.role)] = row;
    if (row.id != null) byId[String(row.id)] = row;
  }
  return { byRole, byId };
}

/** 从式神卡牌映射中提取每个式神（按 role 唯一，优先基础卡 role*100） */
export function shishenOptions(map: ShishenCardMap): Card[] {
  const byRole = new Map<string, Card>();
  for (const card of Object.values(map.byId)) {
    const role = card.role != null ? String(card.role) : null;
    if (!role) continue;
    const base = Number(role) * 100;
    const cur = byRole.get(role);
    if (!cur) {
      byRole.set(role, card);
    } else if (Number(card.id) === base) {
      byRole.set(role, card);
    } else if (
      Number(cur.id) !== base &&
      Number(card.id) < Number(cur.id)
    ) {
      byRole.set(role, card);
    }
  }
  return Array.from(byRole.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "zh")
  );
}

/** 解析头像 id：优先卡牌 id，其次 role*100 */
export function avatarIdOf(role: string | null, card?: Card | null): number {
  if (card) return Number(card.id);
  const n = Number(role);
  return Number.isFinite(n) ? n * 100 : 0;
}

/* ------------------------- 式神评分 ------------------------- */

/** 式神评分 + 对应卡牌（用于强度榜展示） */
export interface RankedShishen {
  rating: ShishenScore;
  card: Card | null;
  name: string;
  faction: string;
  avatarId: number;
}

export function resolveRatingCard(
  map: ShishenCardMap,
  score: ShishenScore
): RankedShishen {
  const card = map.byRole[score.role] ?? null;
  return {
    rating: score,
    card,
    name: score.name ?? card?.name ?? score.role,
    faction: score.faction ?? card?.faction ?? "未知",
    avatarId: avatarIdOf(score.role, card),
  };
}

/** 读取某用户的评分系统（式神评分数组） */
export async function getRatingSystem(userId: number): Promise<ShishenScore[]> {
  const { data } = await supabase
    .from("shishen_ratings")
    .select("shishen")
    .eq("user_id", userId)
    .maybeSingle();
  return ((data?.shishen ?? []) as ShishenScore[]);
}

/** 读取所有评分系统（后台用） */
export async function getRatingSystems(): Promise<ShishenRatingSystem[]> {
  const { data, error } = await supabase
    .from("shishen_ratings")
    .select("*");
  if (error) throw error;
  return (data ?? []) as ShishenRatingSystem[];
}

/** 写入某用户的评分系统（整条 upsert） */
export async function saveRatingSystem(
  userId: number,
  shishen: ShishenScore[]
): Promise<string | null> {
  const { error } = await supabase.from("shishen_ratings").upsert(
    { user_id: userId, shishen, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  return error?.message ?? null;
}

/** 用户展示名：管理员统一显示为「默认」 */
export function userLabel(u: {
  role?: string | null;
  nickname?: string | null;
  username: string;
}): string {
  return u.role === "admin" ? "默认" : u.nickname || u.username;
}

/** 查询拥有式神评分的用户（用于强度榜 / 首页切换评分系统） */
export async function getRatingOwners(): Promise<
  { id: number; name: string; isDefault: boolean }[]
> {
  const { data: rows } = await supabase
    .from("shishen_ratings")
    .select("user_id");
  const ids = Array.from(
    new Set((rows ?? []).map((r: { user_id: number }) => r.user_id))
  );
  if (ids.length === 0) return [];
  const { data: users } = await supabase
    .from("users")
    .select("id, username, nickname, role")
    .in("id", ids);
  const owners = ((users ?? []) as AppUser[]).map((u) => ({
    id: u.id,
    name: userLabel(u),
    isDefault: u.role === "admin",
  }));
  // 默认评分排在最前
  return owners.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/* ------------------------- 卡组评分 ------------------------- */

/** 查询卡组评分，可按用户过滤 */
export async function getDeckRatings(
  userId?: number | null
): Promise<DeckRating[]> {
  let builder = supabase
    .from("deck_ratings")
    .select("*")
    .order("score", { ascending: false });
  if (userId != null) builder = builder.eq("user_id", userId);
  const { data, error } = await builder;
  if (error) throw error;
  return (data ?? []) as DeckRating[];
}

/* ------------------------- 用户 ------------------------- */

/** 查询所有用户（后台用） */
export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, nickname, role, created_at")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AppUser[];
}
