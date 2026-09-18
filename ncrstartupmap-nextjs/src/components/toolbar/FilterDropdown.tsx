import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  className,
  wrapperClassName,
  placeholder,
  id: idProp,
}: {
  label: string;
  value: T | null;
  options: readonly T[];
  onSelect: (value: T | null) => void;
  className?: string;
  /** Classes for the outer wrapper — use for flex sizing in a row layout. */
  wrapperClassName?: string;
  /** Text for the "clear" option (defaults to `All <label>s`). */
  placeholder?: string;
  /**
   * DOM id override. Since M5's dual shell, the desktop toolbar and the
   * mobile FilterTray render simultaneously (one is CSS-hidden), so each
   * needs distinct select ids — the tray passes `filter-mobile-*`. The
   * desktop default (`filter-<label>`) is unchanged.
   */
  id?: string;
}) {
  const id = idProp ?? `filter-${label.toLowerCase()}`;

  // Stale-value guard: if the selected value no longer exists in the
  // options (e.g. the dataset changed), clear it once so the select
  // never renders blank with an unrecoverable phantom selection.
  // Skipped while the dataset is momentarily empty (refetch / first load):
  // "no data yet" must not silently wipe the user's filter.
  useEffect(() => {
    if (options.length > 0 && value !== null && !options.includes(value)) {
      onSelect(null);
    }
    // Intentionally keyed on options identity + value only; onSelect is a
    // stable store setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value]);

  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onSelect((event.target.value || null) as T | null)}
        className={cn(
          "h-9 min-w-32 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50",
          className,
        )}
      >
        <option value="">{placeholder ?? `All ${label.toLowerCase()}s`}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
