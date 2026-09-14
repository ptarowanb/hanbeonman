"use client";

import { useEffect, useId, useRef, useState } from "react";
import { generateQrDataUrl, validateSharingText } from "./sharingActions";
import styles from "./SharingRunner.module.css";

type SharingRunnerProps = {
  actionKind: "qr_code" | "text_copy";
  fixedInputs: Record<string, string | number | boolean>;
};

function QrCode({ text }: { text: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setImage(null);
    setError("");
    generateQrDataUrl(text).then(dataUrl => {
      if (current) setImage(dataUrl);
    }).catch(() => {
      if (current) setError("QR코드를 만들지 못했습니다. 다시 시도해주세요.");
    });
    return () => { current = false; };
  }, [text, retry]);

  return <section className={styles.card} aria-label="QR코드 결과">
    <h3>QR코드로 간편하게 공유하세요</h3>
    <p className={styles.hint}>카메라로 스캔하거나 이미지로 저장할 수 있어요.</p>
    {image ? <div className={styles.qrResult}>
      {/* The PNG is created in this browser and requires no image server. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.qrImage} src={image} alt="생성된 QR코드" width={320} height={320} />
      <a className={styles.primary} href={image} download="hanbeonman-qr.png">QR코드 PNG 다운로드</a>
    </div> : <p role="status" className={styles.notice}>{error || "QR코드를 만들고 있어요."}</p>}
    {error && <button type="button" className={styles.secondary} onClick={() => setRetry(value => value + 1)}>다시 만들기</button>}
    <p className={styles.content} aria-label="QR코드 내용">{text}</p>
    <p className={styles.hint}>QR 이미지는 이 기기에서 만들어요.</p>
  </section>;
}

async function tryCopyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function SavedText({ text }: { text: string }) {
  const inputId = useId();
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const initialCopy = useRef<Promise<boolean> | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("저장한 글을 복사하고 있어요.");

  function showResult(success: boolean) {
    setBusy(false);
    if (success) setNotice("저장한 글을 복사했습니다.");
    else {
      outputRef.current?.focus();
      outputRef.current?.select();
      setNotice("자동 복사가 차단되어 글을 선택했습니다. 직접 복사하거나 다시 복사해주세요.");
    }
  }

  useEffect(() => {
    mounted.current = true;
    const run = ++generation.current;
    // Reuse the first attempt when React replays effects in Strict Mode.
    initialCopy.current ??= tryCopyText(text);
    initialCopy.current.then(success => {
      if (mounted.current && run === generation.current) showResult(success);
    });
    return () => { mounted.current = false; generation.current += 1; };
  }, [text]);

  async function copy() {
    const run = ++generation.current;
    setBusy(true);
    const success = await tryCopyText(text);
    if (mounted.current && run === generation.current) showResult(success);
  }

  return <section className={styles.card} aria-label="문구 복사 결과">
    <h3>자주 쓰는 글을 바로 붙여넣으세요</h3>
    <label className={styles.label} htmlFor={inputId}>저장한 글</label>
    <textarea id={inputId} className={styles.textarea} ref={outputRef} value={text} readOnly />
    <p role="status" className={styles.notice}>{notice}</p>
    <button type="button" className={styles.primary} disabled={busy} onClick={() => void copy()}>다시 복사</button>
  </section>;
}

export default function SharingRunner({ actionKind, fixedInputs }: SharingRunnerProps) {
  let text: string;
  try {
    text = validateSharingText(typeof fixedInputs.text === "string" ? fixedInputs.text : "");
  } catch (error) {
    return <p role="alert" className={styles.notice}>{error instanceof Error ? error.message : "내용을 확인해주세요."}</p>;
  }
  return actionKind === "qr_code" ? <QrCode key={text} text={text} /> : <SavedText key={text} text={text} />;
}
