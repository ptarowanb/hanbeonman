import { describe, expect, it } from "vitest";
import {
  DEFAULT_PHOTO_OPTIONS,
  buildPhotoOutputName,
  createZip,
  validatePhotoBatch,
} from "./index";

describe("사진 입력 계약", () => {
  it("지원 형식·개수·크기·픽셀 제한을 통과시킨다", () => {
    expect(
      validatePhotoBatch([
        {
          name: "사진 1.png",
          type: "image/png",
          size: 1024,
          width: 2000,
          height: 1000,
        },
      ]),
    ).toEqual({
      success: true,
      data: { count: 1, totalBytes: 1024 },
    });
  });

  it("지원하지 않는 형식과 제한 초과를 파일별 오류로 거부한다", () => {
    expect(
      validatePhotoBatch([
        {
          name: "문서.gif",
          type: "image/gif",
          size: 1024,
          width: 10,
          height: 10,
        },
      ]),
    ).toEqual({ success: false, issues: ["문서.gif: JPEG, PNG, WebP만 지원합니다."] });

    expect(
      validatePhotoBatch([
        {
          name: "너무 큰 사진.jpg",
          type: "image/jpeg",
          size: 20 * 1024 * 1024 + 1,
          width: 10,
          height: 10,
        },
      ]),
    ).toEqual({ success: false, issues: ["너무 큰 사진.jpg: 파일은 20MB 이하여야 합니다."] });
  });

  it("빈 목록과 10개 초과, 메가픽셀 초과를 거부한다", () => {
    expect(validatePhotoBatch([])).toEqual({
      success: false,
      issues: ["사진을 1개 이상 선택하세요."],
    });

    const eleven = Array.from({ length: 11 }, (_, index) => ({
      name: `photo-${index}.jpg`,
      type: "image/jpeg",
      size: 1,
      width: 1,
      height: 1,
    }));
    expect(validatePhotoBatch(eleven)).toEqual({
      success: false,
      issues: ["사진은 한 번에 최대 10개까지 선택할 수 있습니다."],
    });

    expect(
      validatePhotoBatch([
        {
          name: "고해상도.jpg",
          type: "image/jpeg",
          size: 1,
          width: 6000,
          height: 4001,
        },
      ]),
    ).toEqual({ success: false, issues: ["고해상도.jpg: 이미지가 24메가픽셀을 초과합니다."] });
  });

  it("기본 옵션과 순번 파일명을 고정한다", () => {
    expect(DEFAULT_PHOTO_OPTIONS).toEqual({ maxEdge: 1600, quality: 0.82 });
    expect(buildPhotoOutputName(0)).toBe("photo-001.jpg");
    expect(buildPhotoOutputName(9)).toBe("photo-010.jpg");
  });
});

describe("사진 ZIP", () => {
  it("원본 이름 없이 순번 파일을 담은 유효한 ZIP 바이트를 만든다", () => {
    const zip = createZip([
      { name: "photo-001.jpg", data: new Uint8Array([1, 2, 3]) },
      { name: "photo-002.jpg", data: new Uint8Array([4, 5]) },
    ]);
    const decoded = new TextDecoder().decode(zip);

    expect(decoded).toContain("photo-001.jpg");
    expect(decoded).toContain("photo-002.jpg");
    expect(decoded).not.toContain("원본");
    expect(new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint32(0, true)).toBe(
      0x04034b50,
    );
  });
});
