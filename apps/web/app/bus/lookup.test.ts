import { describe, expect, it } from "vitest";
import { filterLookupItems, type LookupItem } from "./lookup";

const items: LookupItem[] = [
  { id: "NAEK010", name: "서울경부" },
  { id: "NAEK300", name: "대전복합" },
  { id: "NAEK200", name: "강릉" },
];

describe("터미널 목록 검색", () => {
  it("터미널 이름과 ID를 대소문자 구분 없이 필터링한다", () => {
    expect(filterLookupItems(items, "대전")).toEqual([{ id: "NAEK300", name: "대전복합" }]);
    expect(filterLookupItems(items, "naek200")).toEqual([{ id: "NAEK200", name: "강릉" }]);
  });

  it("검색어가 없으면 전체 목록을 유지한다", () => {
    expect(filterLookupItems(items, "  ")).toEqual(items);
  });
});
