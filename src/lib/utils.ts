import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 tailwind class，shadcn/ui 标准工具函数 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 清理卡牌描述中的富文本标记（#r 换行、#[关键词]） */
export function cleanDesc(desc?: string | null) {
  if (!desc) return "";
  return desc.replace(/#r/g, " ").replace(/#\[|\]/g, "");
}
