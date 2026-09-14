export type TimerState = {
  version: 1;
  durationMs: number;
  remainingMs: number;
  deadline: number | null;
};

export function createTimer(minutes: number): TimerState {
  return { version: 1, durationMs: minutes * 60_000, remainingMs: minutes * 60_000, deadline: null };
}

export function remainingTimerMs(state: TimerState, now: number): number {
  return Math.max(0, Math.min(state.durationMs, state.deadline === null ? state.remainingMs : state.deadline - now));
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  if (state.deadline !== null || state.remainingMs <= 0) return state;
  return { ...state, deadline: now + state.remainingMs };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  return { ...state, remainingMs: remainingTimerMs(state, now), deadline: null };
}

export function parseTimerState(raw: string | null, minutes: number): TimerState | null {
  if (!raw || raw.length > 1_000) return null;
  try {
    const value = JSON.parse(raw) as Partial<TimerState> | null;
    if (!value || value.version !== 1 || value.durationMs !== minutes * 60_000 ||
      typeof value.remainingMs !== "number" || !Number.isFinite(value.remainingMs) || value.remainingMs < 0 || value.remainingMs > value.durationMs ||
      (value.deadline !== null && (typeof value.deadline !== "number" || !Number.isFinite(value.deadline) || value.deadline < 0))) return null;
    return { version: 1, durationMs: value.durationMs, remainingMs: value.remainingMs, deadline: value.deadline };
  } catch { return null; }
}
