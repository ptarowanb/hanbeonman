import { describe, expect, it } from "vitest";

import { canTransitionRun } from "./run.js";

describe("canTransitionRun", () => {
  it("대기 상태에서 실행 또는 취소로 전이한다", () => {
    expect(canTransitionRun("QUEUED", "RUNNING")).toBe(true);
    expect(canTransitionRun("QUEUED", "CANCELED")).toBe(true);
  });

  it("실행 상태에서 각 종료 상태로 전이한다", () => {
    for (const status of [
      "SUCCEEDED",
      "EMPTY",
      "NEEDS_ATTENTION",
      "FAILED",
      "CANCELED",
    ] as const) {
      expect(canTransitionRun("RUNNING", status)).toBe(true);
    }
  });

  it("취소 후 성공 덮어쓰기와 성공 후 재실행을 거부한다", () => {
    expect(canTransitionRun("CANCELED", "SUCCEEDED")).toBe(false);
    expect(canTransitionRun("SUCCEEDED", "RUNNING")).toBe(false);
  });
});
