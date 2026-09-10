import { describe, expect, it } from "vitest";
import {
  getLocalDateInputValue,
  getNextWeekdayDate,
  parseWeekday,
} from "./weekday";

describe("버스 요일 날짜 계산", () => {
  it("한국어 요일 표현을 숫자 요일로 읽는다", () => {
    expect(parseWeekday("금요일 서울에서 대전 출장")).toBe(5);
    expect(parseWeekday("대전 출장")).toBeNull();
  });

  it("이번 주에 아직 오지 않은 요일은 이번 주 날짜를 반환한다", () => {
    const thursday = new Date(2026, 8, 10, 12);
    const friday = getNextWeekdayDate(thursday, 5);

    expect(getLocalDateInputValue(friday)).toBe("2026-09-11");
  });

  it("이미 지난 요일은 다음 주로 넘기고 오늘 요일은 오늘로 유지한다", () => {
    const thursday = new Date(2026, 8, 10, 12);

    expect(getLocalDateInputValue(getNextWeekdayDate(thursday, 3))).toBe("2026-09-16");
    expect(getLocalDateInputValue(getNextWeekdayDate(thursday, 4))).toBe("2026-09-10");
  });
});
