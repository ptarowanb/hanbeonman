"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PHOTO_OPTIONS,
  buildPhotoOutputName,
  createZip,
  validatePhotoBatch,
  type PhotoFileInfo,
} from "@hanbeonman/photo";

type Notice = { kind: "error" | "success"; message: string };

function readOptions(maxEdgeValue: string, qualityValue: string):
  | { success: true; maxEdge: number; quality: number }
  | { success: false; message: string } {
  const maxEdge = Number(maxEdgeValue);
  if (!Number.isInteger(maxEdge) || maxEdge < 1 || maxEdge > 4096) {
    return { success: false, message: "긴 변은 1~4,096px 사이의 정수로 입력하세요." };
  }
  const quality = Number(qualityValue);
  if (!Number.isFinite(quality) || quality < 0.1 || quality > 1) {
    return { success: false, message: "JPEG 품질은 0.1~1.0 사이로 입력하세요." };
  }
  return { success: true, maxEdge, quality };
}

async function inspectFile(file: File): Promise<PhotoFileInfo> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const info = {
      name: file.name,
      type: file.type,
      size: file.size,
      width: bitmap.width,
      height: bitmap.height,
    };
    bitmap.close();
    return info;
  } catch {
    throw new Error(`${file.name}: 이미지 크기를 확인할 수 없습니다.`);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("JPEG 파일을 만들지 못했습니다."));
    }, "image/jpeg", quality);
  });
}

async function resizeToJpeg(file: File, maxEdge: number, quality: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진 처리 화면을 준비하지 못했습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasBlob(canvas, quality);
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export default function PhotoTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileValidation, setFileValidation] = useState<ReturnType<typeof validatePhotoBatch> | null>(null);
  const [maxEdge, setMaxEdge] = useState(String(DEFAULT_PHOTO_OPTIONS.maxEdge));
  const [quality, setQuality] = useState(String(DEFAULT_PHOTO_OPTIONS.quality));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
    setNotice(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    if (nextFiles.length === 0) {
      setFileValidation(null);
      return;
    }
    try {
      const infos = await Promise.all(nextFiles.map(inspectFile));
      const validation = validatePhotoBatch(infos);
      setFileValidation(validation);
      if (!validation.success) setNotice({ kind: "error", message: validation.issues.join(" ") });
    } catch (error) {
      setFileValidation(null);
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "이미지를 읽지 못했습니다." });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!fileValidation?.success) {
      setNotice({ kind: "error", message: "먼저 처리할 사진을 선택하세요." });
      return;
    }
    const options = readOptions(maxEdge, quality);
    if (!options.success) {
      setNotice({ kind: "error", message: options.message });
      return;
    }
    setIsProcessing(true);
    try {
      const entries = [];
      for (const [index, file] of files.entries()) {
        const data = await resizeToJpeg(file, options.maxEdge, options.quality);
        entries.push({ name: buildPhotoOutputName(index), data });
      }
      const zip = createZip(entries);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(url);
      setNotice({ kind: "success", message: `${entries.length}개 사진을 기기 안에서 변환했습니다.` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "사진을 처리하지 못했습니다." });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form className="photo-tool" onSubmit={handleSubmit}>
      <div className="photo-tool-field">
        <label htmlFor="photo-files">처리할 사진</label>
        <input
          ref={inputRef}
          id="photo-files"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
        />
        <p className="photo-tool-help">JPEG, PNG, WebP · 1~10개 · 사진은 이 브라우저 안에서만 처리합니다.</p>
      </div>

      <div className="photo-tool-options">
        <label>
          긴 변 (px)
          <input type="number" min="1" max="4096" step="1" value={maxEdge} onChange={(event) => setMaxEdge(event.target.value)} />
        </label>
        <label>
          JPEG 품질
          <input type="number" min="0.1" max="1" step="0.01" value={quality} onChange={(event) => setQuality(event.target.value)} />
        </label>
      </div>

      {files.length > 0 && <p className="photo-tool-count">{files.length}개 파일을 선택했어요.</p>}
      {notice && <p className={`photo-tool-notice ${notice.kind}`} role="status">{notice.message}</p>}

      <button className="photo-tool-submit" type="submit" disabled={isProcessing || !fileValidation?.success}>
        {isProcessing ? "사진을 처리하는 중…" : "사진 변환하고 ZIP 만들기"}
      </button>

      {downloadUrl && (
        <a className="photo-tool-download" href={downloadUrl} download="hanbeonman-photos.zip">
          변환한 ZIP 다운로드 ↘
        </a>
      )}

      <button className="photo-tool-reset" type="button" onClick={() => inputRef.current?.click()}>
        다른 사진 고르기
      </button>
    </form>
  );
}
