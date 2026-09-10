import { describe, expect, it } from "vitest";
import { actionRegistry, getActionDefinition } from "./actions.js";

describe("실생활 작업 등록 계약", () => {
  it("버스·사진·날씨 작업만 허용 목록으로 노출한다", () => {
    expect(actionRegistry.map((action) => action.kind)).toEqual([
      "bus_schedule",
      "photo_compress",
      "weather",
    ]);
    expect(actionRegistry.every((action) => action.href.startsWith("/"))).toBe(true);
  });

  it("등록되지 않은 작업은 실행 정의를 얻을 수 없다", () => {
    expect(getActionDefinition("unknown")).toBeUndefined();
    expect(getActionDefinition("weather")?.executionTarget).toBe("server");
  });
});
