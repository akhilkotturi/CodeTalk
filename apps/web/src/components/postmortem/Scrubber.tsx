interface ScrubberProps {
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export function Scrubber({ max, value, onChange }: ScrubberProps) {
  return (
    <div className="scrubber">
      <span className="scrubber-label">Timeline</span>
      <input
        aria-label="Timeline position"
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="scrubber-input"
      />
      <span className="scrubber-count">
        {value} / {max}
      </span>
    </div>
  );
}
