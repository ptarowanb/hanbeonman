import { describe, expect, it } from "vitest";
import { readPhotoPreset, validatePhotoOptions } from "./preset";

describe("사진 버튼 조건 복원", () => {
  it("저장한 크기와 품질을 복원하고 생략된 값은 기본값으로 채운다", () => {
    expect(readPhotoPreset(new URLSearchParams("maxEdge=1280&quality=0.75"))).toEqual({ maxEdge: "1280", quality: "0.75", issues: [] });
    expect(readPhotoPreset(new URLSearchParams("quality=0.5"))).toEqual({ maxEdge: "1600", quality: "0.5", issues: [] });
  });

  it.each(["319", "4097", "1600.5", "", "NaN"])("범위 밖 크기 %s를 적용하지 않고 오류를 안내한다", (value) => {
    const preset = readPhotoPreset(new URLSearchParams({ maxEdge: value, quality: "0.75" }));
    expect(preset.maxEdge).toBe("1600");
    expect(preset.quality).toBe("0.75");
    expect(preset.issues).toHaveLength(1);
    expect(validatePhotoOptions(value, "0.75").success).toBe(false);
  });

  it.each(["0.09", "1.01", "", "Infinity"])("범위 밖 품질 %s를 적용하지 않고 오류를 안내한다", (value) => {
    const preset = readPhotoPreset(new URLSearchParams({ quality: value }));
    expect(preset.quality).toBe("0.82");
    expect(preset.issues).toHaveLength(1);
    expect(validatePhotoOptions("1600", value).success).toBe(false);
  });

  it("허용 범위의 양 끝 값을 사용할 수 있다", () => {
    expect(validatePhotoOptions("320", "0.1")).toEqual({ success: true, maxEdge: 320, quality: 0.1 });
    expect(validatePhotoOptions("4096", "1")).toEqual({ success: true, maxEdge: 4096, quality: 1 });
  });
});
