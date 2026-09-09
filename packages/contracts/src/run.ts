import { z } from "zod";

export const RunStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "EMPTY",
  "NEEDS_ATTENTION",
  "FAILED",
  "CANCELED",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

const terminalStatuses: readonly RunStatus[] = [
  "SUCCEEDED",
  "EMPTY",
  "NEEDS_ATTENTION",
  "FAILED",
  "CANCELED",
];

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  if (from === "QUEUED") return to === "RUNNING" || to === "CANCELED";
  if (from === "RUNNING") return terminalStatuses.includes(to);
  return false;
}
