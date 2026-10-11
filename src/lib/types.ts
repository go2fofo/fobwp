/** 卡牌数据类型（对应 public.cards，原始卡牌数据） */
export interface Card {
  id: number;
  name: string;
  role: string | null;
  type: string | null;
  xiyoudu: string | null;
  stage: string | null;
  ll: string | null;
  sm: string | null;
  desc: string | null;
  keyword: string | null;
  faction: string | null;
  alias: string[] | null;
  created_at?: string;
}

/** 式神评分条目（评分系统中的一项） */
export interface ShishenScore {
  role: string;
  name: string | null;
  faction: string | null;
  jue_sheng: number;
  zhan_chang: number;
  jie_hou: number;
  guo_pai: number;
  xing_dong_dian: number;
  zeng_yi: number;
  qiang_shi_gou_ci: string | null;
  note: string | null;
  score: number;
  personal_score: number | null;
  evaluation: string | null;
}

/** 式神评分系统（对应 public.shishen_ratings，一个用户一条） */
export interface ShishenRatingSystem {
  id: number;
  user_id: number;
  shishen: ShishenScore[];
  created_at?: string;
  updated_at?: string;
}

/** 卡组评分（对应 public.deck_ratings） */
export interface DeckRating {
  id: number;
  user_id: number | null;
  user_name: string | null;
  name: string;
  faction: string | null;
  shishen_roles: string[];
  score: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

/** 用户类型（对应 public.users，不含密码） */
export interface AppUser {
  id: number;
  username: string;
  nickname: string | null;
  role: string;
  created_at?: string;
}

/** 式神评分维度字段 */
export const RATING_FIELDS: { key: keyof ShishenScore; label: string }[] = [
  { key: "jue_sheng", label: "决胜" },
  { key: "zhan_chang", label: "站场" },
  { key: "jie_hou", label: "解后" },
  { key: "guo_pai", label: "过牌" },
  { key: "xing_dong_dian", label: "行动" },
  { key: "zeng_yi", label: "增益" },
];

/** 派系常量 */
export const FACTIONS = ["红莲", "紫岩", "青岚", "苍叶", "4色"] as const;

/** 卡牌类型常量 */
export const CARD_TYPES = [
  "式神",
  "法术",
  "战斗",
  "形态",
  "结界",
  "协战",
  "衍生",
  "觉醒",
] as const;

/** 稀有度常量 */
export const RARITIES = ["N", "R", "SR", "SSR", "SKIN"] as const;

/** 卡组中允许的最多式神数量 */
export const MAX_DECK = 4;

/** 卡组中允许的最多派系数量 */
export const MAX_FACTIONS = 2;
