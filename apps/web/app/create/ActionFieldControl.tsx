"use client";
import type { ActionField } from "./actionCatalog";
export default function ActionFieldControl({ field, value, onChange, disabled = false, required = false }: { field: ActionField; value: string; onChange: (value: string) => void; disabled?: boolean; required?: boolean }) {
  const common = { value, disabled, required, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value) };
  return <label className="library-field"><span>{field.label}</span>
    {field.options ? <select {...common}><option value="">선택해주세요</option>{field.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    : field.kind === "multiline" ? <textarea {...common} maxLength={200} rows={4} placeholder={field.placeholder} />
    : <input {...common} type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"} min={field.min} max={field.max} step={field.step ?? (field.kind === "number" ? "any" : undefined)} maxLength={field.type==="city"?40:200} placeholder={field.placeholder} />}
  </label>;
}
