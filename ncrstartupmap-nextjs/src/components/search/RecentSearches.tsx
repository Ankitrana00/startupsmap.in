interface RecentSearchesProps {
  history: string[];
  onSelect: (value: string) => void;
  onClear: () => void;
}

export function RecentSearches({ history, onSelect, onClear }: RecentSearchesProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Recent Searches</span>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="px-2 py-1 text-xs bg-accent rounded-full hover:bg-accent/80 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
