/** 派系徽章样式（浅色主题） */
export function factionClass(faction?: string | null): string {
  const map: Record<string, string> = {
    红莲: "bg-rose-50 text-rose-600 border-rose-200",
    紫岩: "bg-purple-50 text-purple-600 border-purple-200",
    青岚: "bg-sky-50 text-sky-600 border-sky-200",
    苍叶: "bg-emerald-50 text-emerald-600 border-emerald-200",
    "4色": "bg-amber-50 text-amber-600 border-amber-200",
  };
  return map[faction ?? ""] ?? "bg-secondary text-secondary-foreground";
}
