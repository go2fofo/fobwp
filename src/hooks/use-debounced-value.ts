"use client";

import * as React from "react";
import debounce from "lodash/debounce";

/** 基于 lodash.debounce 的防抖值 Hook，用于搜索输入等场景 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  const update = React.useMemo(
    () => debounce((v: T) => setDebounced(v), delay),
    [delay]
  );

  React.useEffect(() => {
    update(value);
    return () => update.cancel();
  }, [value, update]);

  return debounced;
}
