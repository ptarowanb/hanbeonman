import { describe, expect, it } from "vitest";

import {
  validateSanitizedEvents,
  type EventSourceContract,
} from "./events.js";

const source: EventSourceContract = {
  sourceId: "image.editor",
  fields: {
    photos: {
      operations: ["select_files"],
      safeValues: ["recipient_file_input"],
    },
    quality: { operations: ["set_quality"], safeValues: ["0.82"] },
  },
};

const event = {
  sequence: 1,
  relativeTimeMs: 20,
  sourceId: "image.editor",
  operation: "select_files",
  fieldKey: "photos",
  safeValue: "recipient_file_input",
};

describe("validateSanitizedEvents", () => {
  it("등록된 소스·필드·동작·안전 값의 정제 이벤트를 허용한다", () => {
    expect(validateSanitizedEvents([event], [source])).toEqual({
      success: true,
      data: [event],
    });
  });

  it.each([
    ["미등록 필드", { ...event, fieldKey: "filename" }],
    ["파일명", { ...event, filename: "가족사진.jpg" }],
    ["EXIF", { ...event, exif: { gps: "37,127" } }],
    ["인증정보", { ...event, credential: "secret" }],
    ["실제 파일 값", { ...event, safeValue: "가족사진.jpg" }],
  ])("%s가 포함된 이벤트를 거부한다", (_name, value) => {
    expect(validateSanitizedEvents([value], [source]).success).toBe(false);
  });

  it("순번과 상대 시각이 역행하는 이벤트를 거부한다", () => {
    expect(
      validateSanitizedEvents(
        [event, { ...event, sequence: 1, relativeTimeMs: 10 }],
        [source],
      ).success,
    ).toBe(false);
  });

  it("등록 정책이 허용해도 사진 선택의 실제 파일명을 거부한다", () => {
    const unsafeSource: EventSourceContract = {
      sourceId: "image.editor",
      fields: {
        photos: {
          operations: ["select_files"],
          safeValues: ["가족사진.jpg"],
        },
      },
    };

    expect(
      validateSanitizedEvents(
        [{ ...event, relativeTimeMs: 0, safeValue: "가족사진.jpg" }],
        [unsafeSource],
      ).success,
    ).toBe(false);
  });

  it.each(["constructor", "__proto__", "toString"])(
    "상속된 객체 키 %s를 미등록 필드 실패로 반환한다",
    (fieldKey) => {
      const result = validateSanitizedEvents(
        [{ ...event, relativeTimeMs: 0, fieldKey }],
        [source],
      );
      expect(result.success).toBe(false);
    },
  );
});
