import { describe, expect, it } from "vitest";
import { buildDirectionsUrl, generateQrDataUrl, validateSharingText } from "./sharingActions";

describe("생활 공유 도구", () => {
  it("목적지만 입력하면 출발지를 지정하지 않은 대중교통 길찾기를 연다", () => {
    const url = new URL(buildDirectionsUrl({ destination: "  서울역  " }));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ api: "1", destination: "서울역", travelmode: "transit" });
  });

  it("주소의 특수문자를 쿼리로 분리하지 않고 목적지와 출발지에 그대로 넣는다", () => {
    const url = new URL(buildDirectionsUrl({ destination: "서울 & 제주 #약속", origin: "인천역", mode: "walking" }));
    expect(url.searchParams.get("destination")).toBe("서울 & 제주 #약속");
    expect(url.searchParams.get("origin")).toBe("인천역");
    expect(url.searchParams.get("travelmode")).toBe("walking");
    expect(url.hash).toBe("");
    expect(url.hostname).toBe("www.google.com");
  });

  it("입력 누락과 지원하지 않는 이동수단 및 너무 긴 지도 URL을 거부한다", () => {
    expect(() => buildDirectionsUrl({})).toThrow();
    expect(() => buildDirectionsUrl({ destination: " " })).toThrow();
    expect(() => buildDirectionsUrl({ destination: "서울역", origin: true })).toThrow();
    expect(() => buildDirectionsUrl({ destination: "서울역", mode: "flying" })).toThrow();
    expect(() => buildDirectionsUrl({ destination: "a".repeat(101) })).toThrow();
    expect(() => buildDirectionsUrl({ destination: "서울역", origin: "a".repeat(101) })).toThrow();
    expect(() => buildDirectionsUrl({ destination: "서".repeat(200), origin: "인".repeat(200) })).toThrow();
  });

  it("문구의 줄바꿈과 공백을 보존하고 빈 내용 및 한도를 벗어난 내용을 거부한다", () => {
    expect(validateSharingText("  안녕하세요.\n감사합니다!  ")).toBe("  안녕하세요.\n감사합니다!  ");
    expect(validateSharingText("a".repeat(200))).toHaveLength(200);
    expect(() => validateSharingText("a".repeat(201))).toThrow();
    expect(() => validateSharingText(" \n ")).toThrow();
  });

  it("한글과 특수문자를 실제 PNG QR 이미지로 만들고 잘못된 내용은 인코딩하지 않는다", async () => {
    const dataUrl = await generateQrDataUrl("https://example.com/약속?name=인천&time=10시");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(320);
    expect(png.readUInt32BE(20)).toBe(320);
    await expect(generateQrDataUrl("")).rejects.toThrow();
  });
});
