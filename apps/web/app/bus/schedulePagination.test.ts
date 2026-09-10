import { describe, expect, it } from "vitest";
import { getSchedulePageCount, getSchedulePageNumbers } from "./schedulePagination";

describe("버스 시간표 페이징", () => {
  it("전체 건수 63개를 10개씩 7페이지로 계산한다", () => {
    expect(getSchedulePageCount(63, 10)).toBe(7);
    expect(getSchedulePageNumbers(7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("페이지 수가 많으면 현재 페이지 주변만 보여준다", () => {
    expect(getSchedulePageNumbers(20, 10)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(getSchedulePageNumbers(0, 1)).toEqual([]);
  });
});
