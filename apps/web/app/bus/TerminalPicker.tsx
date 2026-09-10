"use client";

export type LookupItem = { id: string; name: string };

type TerminalPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: LookupItem[];
  isLoading: boolean;
  error?: string;
};

export default function TerminalPicker({
  label,
  value,
  onChange,
  items,
  isLoading,
  error,
}: TerminalPickerProps) {
  const selectId = `${label}-terminal`;

  return (
    <div className="bus-form-field bus-terminal-field">
      <label htmlFor={selectId}>{label} 터미널</label>
      <select
        id={selectId}
        aria-label={`${label} 터미널`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading || items.length === 0}
      >
        <option value="">
          {isLoading ? "터미널 불러오는 중…" : "터미널을 선택하세요"}
        </option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {item.id}
          </option>
        ))}
      </select>
      {error && <p className="bus-field-error" role="status">{error}</p>}
    </div>
  );
}
