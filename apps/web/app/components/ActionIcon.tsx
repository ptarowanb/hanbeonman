import type { ButtonActionKind } from "@hanbeonman/contracts";
import type { ReactNode } from "react";

const shapes: Record<ButtonActionKind, ReactNode> = {
  weather: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  bus_schedule: <><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2m8-2v2M8 15h1m6 0h1M9 6h6"/></>,
  photo_compress: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 3-3 6 6"/></>,
  checklist: <><path d="m3 6 2 2 3-4m3 2h10M3 13l2 2 3-4m3 2h10M3 20l2 2 3-4m3 2h10"/></>,
  timer: <><circle cx="12" cy="14" r="8"/><path d="M12 10v4l3 2M9 2h6m-3 0v4m6 1 2-2"/></>,
  dday: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/></>,
  split_bill: <><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1M8 15h1m6 0h1M8 19h1m6 0h1"/></>,
  unit_convert: <><path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/></>,
  text_cleanup: <><path d="M4 4h16M4 9h16M4 14h10M4 19h8m6-6v8m-4-4h8"/></>,
  random_pick: <><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01" strokeWidth="3"/></>,
  counter: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/></>,
  qr_code: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6v-3m6-6v1M12 3v3m0 6H3m9 3v6"/></>,
  directions: <><path d="M12 2 22 12 12 22 2 12Z"/><path d="M8 15v-3a2 2 0 0 1 2-2h6m-3-3 3 3-3 3"/></>,
  text_copy: <><rect x="8" y="7" width="12" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2m6-6h4m-4 4h4"/></>,
  discount: <><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="m5 19 14-14"/></>,
  unit_price: <><path d="M12 3v18m-7 0h14M3 7h18M6 7l-4 8h8L6 7Zm12 0-4 8h8l-4-8Z"/></>,
  recipe_scale: <><path d="M7 10H3a4 4 0 0 1 3-7 5 5 0 0 1 9 0 4 4 0 1 1 4 7h-2m-10 0v10h10V10M7 17h10M10 10v3m4-3v3"/></>,
};

export default function ActionIcon({ kind, size = 22 }: { kind: ButtonActionKind; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[kind]}</svg>;
}
