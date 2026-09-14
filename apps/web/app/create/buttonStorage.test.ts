import { describe, expect, it } from "vitest";
import {
  createGeneratedButton,
  parseGeneratedButtons,
  exportButtonBackup,
  importButtonBackup,
  mergeButtonBackup,
  buildButtonShareUrl,
  parseSharedButton,
  writeGeneratedButtons,
  serializeGeneratedButtons,
} from "./buttonStorage.js";

const draft = {
  intent: "create_button" as const,
  schemaVersion: "1.0" as const,
  actionKind: "weather" as const,
  title: "  인천 날씨 확인  ",
  summary: "인천의 현재 날씨를 조회합니다.",
  fixedInputs: { city: "인천" },
  requiredInputs: [],
  clarifyingQuestion: null,
};

describe("자연어 생성 버튼 저장소", () => {
  it("해석 초안을 버튼으로 정규화한다", () => {
    const button = createGeneratedButton(draft, new Date("2026-09-10T12:00:00.000Z"));

    expect(button).toMatchObject({
      id: expect.stringMatching(/^generated-/),
      title: "인천 날씨 확인",
      actionKind: "weather",
      fixedInputs: { city: "인천" },
    });
  });

  it("저장 문자열에서 유효한 버튼만 복원한다", () => {
    const button = createGeneratedButton(draft, new Date("2026-09-10T12:00:00.000Z"));
    const parsed = parseGeneratedButtons(JSON.stringify([button, { id: "bad" }]));

    expect(parsed).toEqual([button]);
  });

  it("동시에 만든 버튼도 다른 ID를 갖는다", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(createGeneratedButton(draft, now).id).not.toBe(createGeneratedButton(draft, now).id);
  });

  it("백업을 복원하고 기존 버튼을 덮어쓰지 않고 병합한다", () => {
    const first = createGeneratedButton(draft);
    const second = createGeneratedButton({ ...draft, title: "서울 날씨", fixedInputs: { city: "서울" } });
    const restored = importButtonBackup(exportButtonBackup([first, second]));
    expect(restored).toEqual([first, second]);
    expect(mergeButtonBackup([first], restored)).toEqual([first, second]);
  });

  it("잘못된 작업 또는 지나치게 큰 백업을 통째로 거부한다", () => {
    const first = createGeneratedButton(draft);
    expect(() => importButtonBackup(JSON.stringify({ format: "hanbeonman-buttons", version: 1, buttons: [first, { ...first, fixedInputs: { city: true } }] }))).toThrow();
    expect(() => importButtonBackup(" ".repeat(200_001))).toThrow();
    expect(parseGeneratedButtons(JSON.stringify([{ ...first, fixedInputs: { url: "https://example.com" } }]))).toEqual([]);
  });

  it("한도 초과 시 기존 버튼을 삭제하지 않는다", () => {
    const existing = Array.from({ length: 50 }, () => createGeneratedButton(draft));
    expect(() => mergeButtonBackup(existing, [createGeneratedButton(draft)])).toThrow();
    expect(existing).toHaveLength(50);
  });

  it("설정 링크는 검토 가능한 초안으로 복원되며 ID는 전달하지 않는다", () => {
    const button = createGeneratedButton(draft);
    const url = new URL(buildButtonShareUrl(button, "https://example.com"));
    const restored = parseSharedButton(url.hash);
    expect(restored).toMatchObject({ intent: "create_button", fixedInputs: { city: "인천" } });
    expect(restored).not.toHaveProperty("id");
    expect(() => parseSharedButton("#button=%invalid")).toThrow();
  });

  it("저장 용량 오류를 숨기지 않는다", () => {
    expect(() => writeGeneratedButtons({ setItem: () => { throw new Error("QuotaExceededError"); } }, [createGeneratedButton(draft)])).toThrow(/저장/);
  });

  it("예전에 저장한 부분 버스 버튼은 빠진 터미널 입력을 보충해 보존한다", () => {
    const legacy = {
      id: "generated-1726000000000", actionKind: "bus_schedule", title: "서울에서 출발",
      summary: "도착지를 골라 시간표를 확인합니다.", fixedInputs: { departure: "서울" },
      requiredInputs: [], createdAt: "2026-09-10T12:00:00Z", updatedAt: "2026-09-11T12:00:00Z", favorite: true,
    };
    const restored = parseGeneratedButtons(JSON.stringify([legacy]));
    expect(restored).toEqual([{
      ...legacy,
      requiredInputs: [{ key: "arrival", label: "도착 터미널", type: "terminal", required: true }],
    }]);
    expect(parseGeneratedButtons(serializeGeneratedButtons(restored))).toEqual(restored);
    expect(() => importButtonBackup(JSON.stringify({ format: "hanbeonman-buttons", version: 1, buttons: [legacy] }))).toThrow();
    const shared = { ...draft, actionKind: "bus_schedule", fixedInputs: { departure: "서울" } };
    expect(() => parseSharedButton(`#button=${encodeURIComponent(JSON.stringify(shared))}`)).toThrow();
  });

  it("버스 필수 터미널을 둘 다 보충하며 기존 선택 입력의 이름도 유지한다", () => {
    const legacy = {
      id: "generated-1726000000000", actionKind: "bus_schedule", title: "버스 시간표",
      summary: "터미널을 골라 조회합니다.", fixedInputs: {},
      requiredInputs: [{ key: "arrival", label: "가려는 곳", type: "terminal", required: false }],
      createdAt: "2026-09-10T12:00:00Z",
    };
    expect(parseGeneratedButtons(JSON.stringify([legacy]))[0]?.requiredInputs).toEqual([
      { key: "arrival", label: "가려는 곳", type: "terminal", required: true },
      { key: "departure", label: "출발 터미널", type: "terminal", required: true },
    ]);
    expect(parseGeneratedButtons(JSON.stringify([{ ...legacy, fixedInputs: [] }]))).toEqual([]);
    expect(parseGeneratedButtons(JSON.stringify([{ ...legacy, fixedInputs: { departure: true } }]))).toEqual([]);
  });

  it("200KB 백업 한도는 한글을 포함한 UTF-8 바이트 크기로 검사한다", () => {
    const button = createGeneratedButton(draft);
    const raw = JSON.stringify({ format: "hanbeonman-buttons", version: 1, buttons: [button], padding: "가".repeat(70_000) });
    expect(raw.length).toBeLessThan(200_000);
    expect(() => importButtonBackup(raw)).toThrow(/200KB/);
  });

  it("다음 읽기에서 버려질 크기의 저장과 백업 생성을 거부해 기존 저장값을 보존한다", () => {
    const button = createGeneratedButton(draft);
    const oversized = { ...button, createdAt: `${" ".repeat(200_000)}${button.createdAt}` };
    const stored = new Map<string, string>([["hanbeonman.generated-buttons", "기존 값"]]);
    expect(() => serializeGeneratedButtons([oversized])).toThrow();
    expect(() => exportButtonBackup([oversized])).toThrow();
    expect(() => writeGeneratedButtons({ setItem: (key, value) => { stored.set(key, value); } }, [oversized])).toThrow();
    expect(stored.get("hanbeonman.generated-buttons")).toBe("기존 값");
    expect(parseGeneratedButtons(JSON.stringify([{ ...button, padding: "가".repeat(70_000) }]))).toEqual([]);
  });
});
