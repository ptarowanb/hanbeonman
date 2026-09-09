export const MAX_PHOTO_COUNT = 10;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_PHOTO_BYTES = 50 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 24_000_000;

export const DEFAULT_PHOTO_OPTIONS = {
  maxEdge: 1600,
  quality: 0.82,
} as const;

export type PhotoFileInfo = {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
};

export type PhotoBatchValidation =
  | { success: true; data: { count: number; totalBytes: number } }
  | { success: false; issues: string[] };

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validatePhotoBatch(files: readonly PhotoFileInfo[]): PhotoBatchValidation {
  if (files.length === 0) {
    return { success: false, issues: ["사진을 1개 이상 선택하세요."] };
  }
  if (files.length > MAX_PHOTO_COUNT) {
    return {
      success: false,
      issues: [`사진은 한 번에 최대 ${MAX_PHOTO_COUNT}개까지 선택할 수 있습니다.`],
    };
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const issues: string[] = [];
  if (totalBytes > MAX_TOTAL_PHOTO_BYTES) {
    issues.push("사진 전체 크기는 50MB 이하여야 합니다.");
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      issues.push(`${file.name}: JPEG, PNG, WebP만 지원합니다.`);
      continue;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      issues.push(`${file.name}: 파일은 20MB 이하여야 합니다.`);
    }
    if (
      !Number.isInteger(file.width) ||
      !Number.isInteger(file.height) ||
      file.width <= 0 ||
      file.height <= 0
    ) {
      issues.push(`${file.name}: 이미지 크기를 확인할 수 없습니다.`);
    } else if (file.width * file.height > MAX_PHOTO_PIXELS) {
      issues.push(`${file.name}: 이미지가 24메가픽셀을 초과합니다.`);
    }
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, data: { count: files.length, totalBytes } };
}

export function buildPhotoOutputName(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_PHOTO_COUNT) {
    throw new RangeError("사진 순번은 0부터 9까지의 정수여야 합니다.");
  }
  return `photo-${String(index + 1).padStart(3, "0")}.jpg`;
}

export type ZipEntry = { name: string; data: Uint8Array<ArrayBufferLike> };

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeHeader(view: DataView, offset: number, signature: number): void {
  view.setUint32(offset, signature, true);
}

export function createZip(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  if (entries.length === 0) throw new RangeError("ZIP에 파일이 하나 이상 필요합니다.");

  const encoder = new TextEncoder();
  const files = entries.map((entry) => ({
    ...entry,
    nameBytes: encoder.encode(entry.name),
    crc: crc32(entry.data),
  }));
  const localSize = files.reduce((sum, file) => sum + 30 + file.nameBytes.length + file.data.length, 0);
  const centralSize = files.reduce((sum, file) => sum + 46 + file.nameBytes.length, 0);
  const output = new Uint8Array(new ArrayBuffer(localSize + centralSize + 22));
  const view = new DataView(output.buffer);
  const offsets: number[] = [];
  let cursor = 0;

  for (const file of files) {
    offsets.push(cursor);
    writeHeader(view, cursor, 0x04034b50);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x800, true);
    view.setUint32(cursor + 14, file.crc, true);
    view.setUint32(cursor + 18, file.data.length, true);
    view.setUint32(cursor + 22, file.data.length, true);
    view.setUint16(cursor + 26, file.nameBytes.length, true);
    view.setUint16(cursor + 28, 0, true);
    output.set(file.nameBytes, cursor + 30);
    output.set(file.data, cursor + 30 + file.nameBytes.length);
    cursor += 30 + file.nameBytes.length + file.data.length;
  }

  const centralOffset = cursor;
  files.forEach((file, index) => {
    writeHeader(view, cursor, 0x02014b50);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x800, true);
    view.setUint32(cursor + 16, file.crc, true);
    view.setUint32(cursor + 20, file.data.length, true);
    view.setUint32(cursor + 24, file.data.length, true);
    view.setUint16(cursor + 28, file.nameBytes.length, true);
    view.setUint16(cursor + 30, 0, true);
    view.setUint16(cursor + 32, 0, true);
    view.setUint16(cursor + 34, 0, true);
    view.setUint32(cursor + 38, 0, true);
    view.setUint32(cursor + 42, offsets[index] ?? 0, true);
    output.set(file.nameBytes, cursor + 46);
    cursor += 46 + file.nameBytes.length;
  });

  writeHeader(view, cursor, 0x06054b50);
  view.setUint16(cursor + 8, files.length, true);
  view.setUint16(cursor + 10, files.length, true);
  view.setUint32(cursor + 12, centralSize, true);
  view.setUint32(cursor + 16, centralOffset, true);
  return output;
}
