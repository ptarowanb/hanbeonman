"use client";

import type { LookupItem } from "./lookup";
import { UNRESOLVED_GRADE } from "./preset";

type GradePickerProps = {
  value: string;
  onChange: (value: string) => void;
  items: LookupItem[];
  isLoading: boolean;
  error?: string;
  unresolvedLabel?: string | undefined;
};

export default function GradePicker({
  value,
  onChange,
  items,
  isLoading,
  error,
  unresolvedLabel,
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
        {unresolvedLabel && <option value={UNRESOLVED_GRADE} disabled>{unresolvedLabel} · 다시 선택해주세요</option>}
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
