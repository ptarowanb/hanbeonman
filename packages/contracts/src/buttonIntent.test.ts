import { describe, expect, it } from "vitest";
import { ButtonIntentSchema, parseButtonIntent } from "./buttonIntent.js";

describe("자연어 버튼 해석 계약", () => {
  const draft = (actionKind: string, fixedInputs: Record<string, unknown>, requiredInputs: unknown[] = []) => ({
    schemaVersion: "1.0", intent: "create_button", actionKind, title: "생활 버튼", summary: "반복 작업을 실행합니다.",
    fixedInputs, requiredInputs, clarifyingQuestion: null,
  });

  it.each([
    ["checklist", { items: "지갑\n열쇠" }], ["timer", { minutes: 25 }],
    ["photo_compress", { maxEdge: 1920, quality: 0.8 }],
    ["bus_schedule", { departure: "서울", arrival: "대전", weekday: 5, date: "2026-09-18" }],
    ["dday", { date: "2026-09-18", event: "여행" }], ["split_bill", { amount: 35000, people: 3 }],
    ["unit_convert", { value: 1500, from: "m", to: "km" }],
    ["text_cleanup", { mode: "deduplicate" }], ["random_pick", { options: "한식\n중식" }], ["counter", { step: 1 }],
    ["qr_code", { text: "https://example.com/menu" }],
    ["directions", { destination: "강남역", origin: "서울역", mode: "transit" }],
    ["text_copy", { text: "서울시 중구 세종대로 110" }],
    ["discount", { price: 50000, rate: 20 }],
    ["unit_price", { priceA: 3000, quantityA: 500, priceB: 5000, quantityB: 1000, unit: "g" }],
    ["recipe_scale", { baseServings: 2, targetServings: 3, ingredients: "쌀 200 g\n설탕 1/2 큰술" }],
  ])("%s 작업의 유효한 고정 조건을 허용한다", (actionKind, inputs) => {
    expect(parseButtonIntent(draft(String(actionKind), inputs as Record<string, unknown>)).success).toBe(true);
  });

  it.each([
    ["weather", { city: true }], ["weather", { city: "서".repeat(41) }],
    ["timer", { minutes: "25" }], ["timer", { minutes: 0 }], ["timer", { minutes: 181 }], ["timer", { minutes: 1.5 }],
    ["checklist", { items: Array.from({ length: 21 }, () => "짐").join("\n") }], ["checklist", { items: "지갑\n\n열쇠" }],
    ["photo_compress", { maxEdge: 319 }], ["photo_compress", { quality: 1.1 }], ["photo_compress", { quality: false }],
    ["bus_schedule", { departure: "서울", arrival: "대전", weekday: 7 }],
    ["bus_schedule", { departure: "서울", arrival: "대전", date: "2026-02-30" }],
    ["dday", { date: "2026-02-29" }], ["split_bill", { amount: -1, people: 3 }], ["split_bill", { amount: 1, people: 0 }], ["split_bill", { amount: 1.5, people: 2 }],
    ["unit_convert", { value: 1, from: "kg", to: "m" }], ["unit_convert", { value: 1, from: "unknown", to: "m" }],
    ["text_cleanup", { mode: "execute" }], ["random_pick", { options: "한 가지" }], ["random_pick", { options: "한식\n한식" }], ["counter", { step: 0 }],
    ["qr_code", { text: " " }], ["qr_code", { text: "가".repeat(201) }],
    ["directions", { destination: "서울", origin: "가".repeat(101) }], ["directions", { destination: "강남역", mode: "teleport" }],
    ["text_copy", { text: true }], ["discount", { price: 1.5, rate: 20 }], ["discount", { price: 100, rate: 101 }],
    ["unit_price", { priceA: 1, quantityA: 0, priceB: 2, quantityB: 1 }],
    ["unit_price", { priceA: 1, quantityA: 1, priceB: 2, quantityB: 1, unit: "kg" }],
    ["recipe_scale", { baseServings: 0, targetServings: 2, ingredients: "쌀 200 g" }],
    ["recipe_scale", { baseServings: 1, targetServings: 2, ingredients: "쌀 200 g\n\n물 300 ml" }],
  ])("%s 작업의 잘못된 값과 타입을 거부한다", (actionKind, inputs) => {
    expect(parseButtonIntent(draft(String(actionKind), inputs as Record<string, unknown>)).success).toBe(false);
  });

  it("프로토타입 키를 고정값과 실행 입력에 사용할 수 없다", () => {
    for (const key of ["constructor", "prototype", "__proto__"]) {
      expect(parseButtonIntent(draft("weather", JSON.parse(`{"city":"서울","${key}":"침입"}`))).success).toBe(false);
      expect(parseButtonIntent(draft("weather", { city: "서울" }, [{ key, label: "값", type: "text", required: true }])).success).toBe(false);
    }
  });

  it.each([
    ["qr_code", ["text"]], ["directions", ["destination"]], ["text_copy", ["text"]],
    ["discount", ["price", "rate"]], ["unit_price", ["priceA", "quantityA", "priceB", "quantityB"]],
    ["recipe_scale", ["baseServings", "targetServings", "ingredients"]],
  ])("%s 필수 조건을 실행 입력으로 받고 누락·중복 조건은 거부한다", (kind, fields) => {
    const inputs = (fields as string[]).map((key) => ({ key, label: key, type: "text", required: true }));
    expect(parseButtonIntent(draft(String(kind), {}, inputs)).success).toBe(true);
    expect(parseButtonIntent(draft(String(kind), {}, inputs.slice(1))).success).toBe(false);
    expect(parseButtonIntent(draft(String(kind), {}, [...inputs, inputs[0]])).success).toBe(false);
  });

  it("누락한 도시·시간·경로는 실행 입력으로 받을 수 있다", () => {
    expect(parseButtonIntent(draft("timer", {}, [{ key: "minutes", label: "시간(분)", type: "text", required: true }])).success).toBe(true);
    expect(parseButtonIntent(draft("bus_schedule", {}, [
      { key: "departure", label: "출발", type: "terminal", required: true },
      { key: "arrival", label: "도착", type: "terminal", required: true },
    ])).success).toBe(true);
    expect(parseButtonIntent(draft("timer", {})).success).toBe(false);
  });

  it("날씨 버튼 생성 초안을 허용한다", () => {
    const result = parseButtonIntent({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "weather",
      title: "인천 날씨 확인",
      summary: "인천의 현재 날씨를 조회합니다.",
      fixedInputs: { city: "인천" },
      requiredInputs: [],
      clarifyingQuestion: null,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fixedInputs).toEqual({ city: "인천" });
  });

  it("필수 입력이 빠진 clarify 결과를 허용한다", () => {
    const result = parseButtonIntent({
      schemaVersion: "1.0",
      intent: "clarify",
      actionKind: "weather",
      title: "날씨 확인",
      summary: "도시의 현재 날씨를 조회합니다.",
      fixedInputs: {},
      requiredInputs: [{ key: "city", label: "날씨를 확인할 도시", type: "city", required: true }],
      clarifyingQuestion: "어느 도시의 날씨를 확인할까요?",
    });

    expect(result.success).toBe(true);
  });

  it("등록되지 않은 작업과 임의 필드를 거부한다", () => {
    expect(ButtonIntentSchema.safeParse({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "send_money",
      title: "송금 버튼",
      summary: "송금합니다.",
      fixedInputs: { account: "1234" },
      requiredInputs: [],
      clarifyingQuestion: null,
      code: "fetch('/bank')",
    }).success).toBe(false);
  });

  it("작업별로 허용되지 않은 입력 필드를 거부한다", () => {
    expect(parseButtonIntent({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "weather",
      title: "날씨 버튼",
      summary: "날씨를 조회합니다.",
      fixedInputs: { account: "1234" },
      requiredInputs: [],
      clarifyingQuestion: null,
    }).success).toBe(false);
  });

  it("날씨 버튼은 도시를 고정하거나 실행 입력으로 받아야 한다", () => {
    expect(parseButtonIntent({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "weather",
      title: "날씨 버튼",
      summary: "날씨를 조회합니다.",
      fixedInputs: {},
      requiredInputs: [],
      clarifyingQuestion: null,
    }).success).toBe(false);
  });
});
