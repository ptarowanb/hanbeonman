import { describe, expect, it } from "vitest";
import {
  createQuickButton,
  getLocalDateInputValue,
  parseQuickButtons,
  serializeQuickButtons,
} from "./quickButton";

describe("반복 조회 버튼 저장 계약", () => {
  it("저장 버튼을 안전하게 정규화하고 날짜는 현지 기준으로 만든다", () => {
    const button = createQuickButton({
      name: "  금요일 대전 출장  ",
      departure: { id: "NAEK010", name: "서울경부" },
      arrival: { id: "NAEK300", name: "대전복합" },
      grade: { id: "2", name: "우등" },
    }, new Date("2026-09-10T23:30:00+09:00"));

    expect(button.name).toBe("금요일 대전 출장");
    expect(button.id).toMatch(/^bus-/);
    expect(getLocalDateInputValue(new Date("2026-09-10T23:30:00+09:00"))).toBe("2026-09-10");
    expect(parseQuickButtons(serializeQuickButtons([button]))).toEqual([button]);
  });

  it("깨진 localStorage 값은 빈 목록으로 처리한다", () => {
    expect(parseQuickButtons("{broken")).toEqual([]);
    expect(parseQuickButtons(JSON.stringify([{ name: "이름만 있음" }]))).toEqual([]);
  });
});
