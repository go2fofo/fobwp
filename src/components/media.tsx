"use client";

import * as React from "react";
import { shishenAvatarUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * 式神头像，加载失败（或 id 无效）时用默认占位（展示式神名称）。
 */
export function ShishenAvatar({
  id,
  name,
  className,
}: {
  id: number | string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const invalid = !id || id === 0 || id === "0";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-border bg-secondary/60",
        className
      )}
    >
      {failed || invalid ? (
        <div className="flex h-full w-full items-center justify-center p-1">
          <span className="line-clamp-3 text-center text-[10px] leading-tight text-muted-foreground">
            {name}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shishenAvatarUrl(id)}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
