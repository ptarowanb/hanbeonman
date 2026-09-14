import { describe, expect, it } from "vitest";
import { createTimer, remainingTimerMs, resumeTimer, pauseTimer, parseTimerState } from "./timerState";

describe("종료 시각 기반 타이머", () => {
  it("탭이 백그라운드여도 경과한 실제 시간만큼 차감한다", () => {
    const running = resumeTimer(createTimer(5), 1_000);
    expect(remainingTimerMs(running, 181_000)).toBe(120_000);
    expect(remainingTimerMs(running, 400_000)).toBe(0);
  });
  it("일시정지 중에는 남은 시간을 유지하고 이어서 시작한다", () => {
    const paused = pauseTimer(resumeTimer(createTimer(1), 1_000), 16_000);
    expect(remainingTimerMs(paused, 500_000)).toBe(45_000);
    expect(remainingTimerMs(resumeTimer(paused, 500_000), 530_000)).toBe(15_000);
  });
  it("저장된 종료 시각을 복원하고 변조된 상태는 거부한다", () => {
    const state = resumeTimer(createTimer(1), 1_000);
    expect(parseTimerState(JSON.stringify(state), 1)).toEqual(state);
    expect(parseTimerState(JSON.stringify({ ...state, remainingMs: -1 }), 1)).toBeNull();
    expect(parseTimerState(JSON.stringify(state), 5)).toBeNull();
  });
});
