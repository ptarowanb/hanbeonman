import { describe, expect, it } from "vitest";
import { readBusPreset, resolveBusLookup } from "./preset";

const terminals = [
  { id: "NAEK010", name: "서울경부" },
  { id: "NAEK300", name: "대전복합" },
  { id: "NAEK200", name: "부산" },
  { id: "NAEK210", name: "부산사상" },
];
const grades = [{ id: "1", name: "고속" }, { id: "2", name: "우등" }];
const sundayUtc = new Date("2026-09-13T15:30:00.000Z"); // 한국 월요일 00:30

describe("저장된 버스 실행 조건", () => {
  it("터미널 ID와 정확한 이름, 명시된 도시 별칭을 해석한다", () => {
    expect(resolveBusLookup(" naek010 ", terminals, true)).toBe("NAEK010");
    expect(resolveBusLookup("대전복합", terminals, true)).toBe("NAEK300");
    expect(resolveBusLookup("서울", terminals, true)).toBe("NAEK010");
    expect(resolveBusLookup("대전", terminals, true)).toBe("NAEK300");
    expect(resolveBusLookup("부산", terminals, true)).toBe("NAEK200");
  });

  it("부분 이름과 중복 이름은 임의 터미널로 선택하지 않는다", () => {
    expect(resolveBusLookup("부", terminals, true)).toBeNull();
    expect(resolveBusLookup("서울", [{ id: "a", name: "서울경부" }, { id: "b", name: "서울경부" }], true)).toBeNull();
    expect(resolveBusLookup("서울", [{ id: "a", name: "동서울" }], true)).toBeNull();
  });

  it("요일만 있으면 한국 날짜 기준 오늘 또는 가장 가까운 다음 요일을 조회한다", () => {
    const params = new URLSearchParams("departure=서울&arrival=대전&grade=우등&weekday=5&auto=1");
    expect(readBusPreset(params, terminals, grades, sundayUtc)).toMatchObject({
      input: { departure: "NAEK010", arrival: "NAEK300", grade: "2", date: "2026-09-18" },
      issues: [], canAutoRun: true,
    });
    params.set("weekday", "1");
    expect(readBusPreset(params, terminals, grades, sundayUtc).input.date).toBe("2026-09-14");
    params.set("weekday", "0");
    expect(readBusPreset(params, terminals, grades, sundayUtc).input.date).toBe("2026-09-20");
  });

  it("명시된 유효한 날짜가 요일보다 우선하고 날짜 조건이 없으면 한국의 오늘을 쓴다", () => {
    const params = new URLSearchParams("departure=NAEK010&arrival=NAEK300&weekday=5&date=2026-10-02");
    expect(readBusPreset(params, terminals, grades, sundayUtc).input.date).toBe("2026-10-02");
    params.delete("date");
    params.delete("weekday");
    expect(readBusPreset(params, terminals, grades, sundayUtc).input.date).toBe("2026-09-14");
    expect(readBusPreset(params, terminals, grades, sundayUtc).canAutoRun).toBe(false);
  });

  it("없는 등급을 전체 등급으로 바꿔 자동 조회하지 않는다", () => {
    const params = new URLSearchParams("departure=서울&arrival=대전&grade=프리미엄&auto=1");
    const preset = readBusPreset(params, terminals, grades, sundayUtc);
    expect(preset.input.grade).toBe("__unresolved__");
    expect(preset.issues).toHaveLength(1);
    expect(preset.canAutoRun).toBe(false);
  });

  it.each([
    "departure=부&arrival=대전&auto=1",
    "departure=서울&arrival=서울경부&auto=1",
    "departure=서울&auto=1",
    "departure=서울&arrival=대전&weekday=8&auto=1",
    "departure=서울&arrival=대전&date=2026-02-30&auto=1",
  ])("불완전하거나 잘못된 조건의 자동 조회를 막는다: %s", (query) => {
    const preset = readBusPreset(new URLSearchParams(query), terminals, grades, sundayUtc);
    expect(preset.issues.length).toBeGreaterThan(0);
    expect(preset.canAutoRun).toBe(false);
  });
});
