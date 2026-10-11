"use client";

import * as React from "react";
import { getShishenCardMap, type ShishenCardMap } from "@/lib/queries";

const EMPTY: ShishenCardMap = { byRole: {}, byId: {} };

/** 加载 cards 表中「式神」卡牌映射，用于解析式神头像 id 与派系 */
export function useShishenCardMap(): ShishenCardMap {
  const [map, setMap] = React.useState<ShishenCardMap>(EMPTY);

  React.useEffect(() => {
    getShishenCardMap()
      .then(setMap)
      .catch(() => {});
  }, []);

  return map;
}
