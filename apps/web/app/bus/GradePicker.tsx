"use client";

import type { LookupItem } from "./TerminalPicker";

type GradePickerProps = {
  value: string;
  onChange: (value: string) => void;
  items: LookupItem[];
  isLoading: boolean;
  error?: string;
};

export default function GradePicker({
  value,
  onChange,
  items,
  isLoading,
  error,
}: GradePickerProps) {
  return (
    <div className="bus-form-field bus-grade-field">
      <label htmlFor="bus-grade">버스 등급</label>
      <select
        id="bus-grade"
        aria-label="버스 등급"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
      >
        <option value="">{isLoading ? "등급 불러오는 중…" : "전체 등급"}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {error && <p className="bus-field-error" role="status">{error}</p>}
    </div>
  );
}
