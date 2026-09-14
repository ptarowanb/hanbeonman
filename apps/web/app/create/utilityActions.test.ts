import { describe, expect, it } from "vitest";
import { countDateDays, splitBill, convertUnit, cleanText, parseChoices } from "./utilityActions";

describe("생활 계산 도구", () => {
  it("서울 날짜 기준으로 윤년과 당일 디데이를 계산한다", () => {
    expect(countDateDays("2028-03-01", new Date("2028-02-28T15:00:00Z"))).toBe(1);
    expect(countDateDays("2026-09-15", new Date("2026-09-14T15:00:00Z"))).toBe(0);
    expect(() => countDateDays("2026-02-30")).toThrow();
  });
  it("나머지 금액도 분배해 합계가 원래 금액과 일치한다", () => {
    const result = splitBill(10000, 3);
    expect(result).toEqual({ base: 3333, extraPeople: 1, extra: 3334 });
    expect(result.base * (3 - result.extraPeople) + result.extra * result.extraPeople).toBe(10000);
    expect(() => splitBill(1000, 0)).toThrow();
  });
  it("길이와 온도를 변환하고 다른 차원의 변환을 거부한다", () => {
    expect(convertUnit(100, "cm", "m")).toBe(1);
    expect(convertUnit(32, "fahrenheit", "celsius")).toBe(0);
    expect(() => convertUnit(1, "kg", "cm")).toThrow();
  });
  it("글 정리는 빈 줄과 중복을 선택한 규칙으로 처리한다", () => {
    expect(cleanText(" 사과  \n\n 사과\n 배 ", "deduplicate")).toBe("사과\n배");
    expect(cleanText(" a   b \n c ", "trim")).toBe("a b\nc");
    expect(() => parseChoices("하나")).toThrow();
    expect(parseChoices("사과\n배")).toEqual(["사과", "배"]);
  });
});
