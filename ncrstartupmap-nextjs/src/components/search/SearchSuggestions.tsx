interface SearchSuggestionsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SearchSuggestions({ suggestions, onSelect, onClose }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
      {suggestions.map((s) => (
        <li key={s} className="px-4 py-2 hover:bg-accent text-sm">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => {
              onSelect(s);
              onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s);
                onClose();
              }
            }}
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}
