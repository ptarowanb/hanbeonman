import { DEFAULT_PHOTO_OPTIONS } from "@hanbeonman/photo";

const sizeIssue = "긴 변은 320~4,096px 사이의 정수로 입력하세요.";
const qualityIssue = "JPEG 품질은 0.1~1.0 사이로 입력하세요.";

function validMaxEdge(value: string): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isInteger(number) && number >= 320 && number <= 4096;
}

function validQuality(value: string): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= 0.1 && number <= 1;
}

export function validatePhotoOptions(maxEdgeValue: string, qualityValue: string):
  | { success: true; maxEdge: number; quality: number }
  | { success: false; message: string } {
  if (!validMaxEdge(maxEdgeValue)) return { success: false, message: sizeIssue };
  if (!validQuality(qualityValue)) return { success: false, message: qualityIssue };
  return { success: true, maxEdge: Number(maxEdgeValue), quality: Number(qualityValue) };
}

export function readPhotoPreset(params: Pick<URLSearchParams, "get">) {
  const issues: string[] = [];
  let maxEdge = String(DEFAULT_PHOTO_OPTIONS.maxEdge);
  let quality = String(DEFAULT_PHOTO_OPTIONS.quality);
  const rawMaxEdge = params.get("maxEdge");
  const rawQuality = params.get("quality");
  if (rawMaxEdge !== null) {
    if (validMaxEdge(rawMaxEdge)) maxEdge = String(Number(rawMaxEdge));
    else issues.push(sizeIssue);
  }
  if (rawQuality !== null) {
    if (validQuality(rawQuality)) quality = String(Number(rawQuality));
    else issues.push(qualityIssue);
  }
  return { maxEdge, quality, issues };
}
