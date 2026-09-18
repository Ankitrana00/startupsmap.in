import { ZoomIn, ZoomOut, Target, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onReset: () => void;
}

export function MapControls({ onZoomIn, onZoomOut, onLocate, onReset }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-500 flex flex-col gap-2 pointer-events-auto">
      <button
        onClick={onZoomIn}
        className={cn(
          "size-10 rounded-lg border border-border bg-background shadow-sm",
          "hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="size-5" />
      </button>
      <button
        onClick={onZoomOut}
        className={cn(
          "size-10 rounded-lg border border-border bg-background shadow-sm",
          "hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="size-5" />
      </button>
      <button
        onClick={onLocate}
        className={cn(
          "size-10 rounded-lg border border-border bg-background shadow-sm",
          "hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label="Center on user location"
        title="Center on user location"
      >
        <Target className="size-5" />
      </button>
      <button
        onClick={onReset}
        className={cn(
          "size-10 rounded-lg border border-border bg-background shadow-sm",
          "hover:bg-accent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label="Reset view"
        title="Reset view"
      >
        <RefreshCw className="size-5" />
      </button>
    </div>
  );
}
