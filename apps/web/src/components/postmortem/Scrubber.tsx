interface ScrubberProps {
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export function Scrubber({ max, value, onChange }: ScrubberProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        aria-label="Timeline position"
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="text-xs text-neutral-500 font-mono">
        {value} / {max}
      </span>
    </div>
  );
}
