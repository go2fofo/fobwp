import { cn } from "@/lib/utils";

/** 梯队评价（结论评价）配色：夯 > 顶级 > 人上人 > NPC > 拉完了 */
const EVAL_CLASS: Record<string, string> = {
  夯: "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-200",
  顶级: "bg-gradient-to-r from-orange-400 to-amber-400 text-white shadow-sm shadow-amber-200",
  人上人: "bg-amber-300 text-amber-950 shadow-sm shadow-amber-100",
  NPC: "bg-slate-200 text-slate-600",
  拉完了: "bg-slate-100 text-slate-400",
};

/**
 * 式神评价「小挂件」：用于突出展示 evaluation 这一最终结论评价。
 */
export function EvaluationBadge({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  const cls = EVAL_CLASS[value] ?? "bg-primary/10 text-primary";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide",
        cls,
        className
      )}
    >
      {value}
    </span>
  );
}
