import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/utils/debounce";

export function SearchBox({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}) {
  // Local input state: typing re-renders only this component.
  // The debounced value is committed to the store, so filtering
  // (and the whole dashboard) updates once per pause, not per keystroke.
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedValue(local, 150);

  // Ref to the last value committed to the store. Used to distinguish
  // "store changed because WE committed" (ignore — local is newer) from
  // "store changed externally" (Clear / empty-state / URL sync — mirror it).
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (debounced !== value) {
      lastCommitted.current = debounced;
      onChange(debounced);
    }
    // onChange is a stable zustand setter; value is read for the guard only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // External store change only: skip when the change is our own commit,
  // otherwise typing "abc" would snap back to "a" when the debounced
  // commit lands mid-typing.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setLocal(value);
    }
    // `local` intentionally excluded — mirroring is driven by `value` only.
  }, [value]);

  const clear = () => {
    lastCommitted.current = "";
    setLocal("");
    onChange("");
  };

  return (
    <div role="search" className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <label htmlFor={id} className="sr-only">
        Search startups
      </label>
      <input
        id={id}
        type="search"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && local !== "") {
            // L8: Escape here means "clear the text". Only when the input is
            // already empty does Escape belong to an overlay above us (the
            // mobile filter tray). stopPropagation keeps both handlers from
            // acting on one keypress — first press clears, second closes.
            event.stopPropagation();
            clear();
          }
        }}
        placeholder="Search startups, sectors, areas…"
        className="no-native-search-clear h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 max-md:h-10 max-md:pr-14 md:w-72"
      />
      {local && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground max-md:p-3.5"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
