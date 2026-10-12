"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** 额外参与搜索的关键词（如别称） */
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/** 可搜索的下拉选择框 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "请选择",
  searchPlaceholder = "搜索…",
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return options;
    return options.filter((o) =>
      [o.label, ...(o.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(kw)
    );
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md bg-transparent pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="slim-scroll max-h-60 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                没有匹配的选项
              </p>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  o.value === value && "text-primary"
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
