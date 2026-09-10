"use client";

import type { ButtonIntent } from "@hanbeonman/contracts";
import { FormEvent, useEffect, useState } from "react";
import {
  createGeneratedButton,
  parseGeneratedButtons,
  serializeGeneratedButtons,
  type GeneratedButton,
} from "./buttonStorage";

const STORAGE_KEY = "hanbeonman.generated-buttons";
const MAX_BUTTONS = 20;

type InterpretError = { status: "NEEDS_ATTENTION" | "FAILED" | "INVALID_INPUT"; error?: { message?: string } };
type WeatherRunResponse = { status: "OK"; location: { name: string }; current: { temperatureC: number; precipitationMm: number; condition: string } } | InterpretError;

function isInterpretError(value: unknown): value is InterpretError {
  return Boolean(value && typeof value === "object" && "status" in value && ["NEEDS_ATTENTION", "FAILED", "INVALID_INPUT"].includes(String(value.status)));
}

function formatFixedInputs(inputs: Record<string, string | number | boolean>): string {
  const entries = Object.entries(inputs);
  return entries.length > 0 ? entries.map(([key, value]) => `${key}=${String(value)}`).join(", ") : "없음";
}

export default function CreateButtonTool() {
  const [request, setRequest] = useState("");
  const [activeRequest, setActiveRequest] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [clarification, setClarification] = useState<Extract<ButtonIntent, { intent: "clarify" }> | null>(null);
  const [draft, setDraft] = useState<Extract<ButtonIntent, { intent: "create_button" }> | null>(null);
  const [savedButtons, setSavedButtons] = useState<GeneratedButton[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    setSavedButtons(parseGeneratedButtons(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  async function interpret(nextRequest: string) {
    const query = nextRequest.trim();
    if (!query) {
      setNotice("만들고 싶은 작업을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setNotice(null);
    setDraft(null);
    setClarification(null);
    try {
      const response = await fetch("/api/buttons/interpret", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null) as ButtonIntent | InterpretError | null
        : null;
      if (!response.ok) {
        const redirectedToVercel = response.redirected && new URL(response.url).hostname === "vercel.com";
        if (response.status === 401 || response.status === 403 || redirectedToVercel) {
          setNotice("Vercel 배포 보호가 버튼 API 요청을 막고 있습니다. 프로젝트의 Deployment Protection 설정을 확인해주세요.");
          return;
        }
        setNotice(isInterpretError(payload) ? payload.error?.message ?? "버튼 요청을 해석하지 못했습니다." : "버튼 요청을 해석하지 못했습니다.");
        return;
      }
      if (!payload) {
        setNotice("버튼 API가 JSON 결과를 반환하지 않았습니다. 배포 설정을 확인해주세요.");
        return;
      }
      if (isInterpretError(payload)) {
        setNotice(payload.error?.message ?? "버튼 요청을 해석하지 못했습니다.");
        return;
      }
      if (payload.intent === "create_button") {
        setDraft(payload);
        setNotice("버튼 초안을 만들었습니다. 내용을 확인한 뒤 저장해주세요.");
      } else if (payload.intent === "clarify") {
        setClarification(payload);
        setClarificationAnswer("");
      } else if (payload.intent === "unsupported") {
        setNotice(`이 작업은 아직 만들 수 없습니다. ${payload.unsupportedReason}`);
      } else {
        setNotice("지금 실행이 아니라 버튼을 만들려면 ‘버튼을 만들어줘’라고 요청해주세요.");
      }
    } catch {
      setNotice("버튼 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = request.trim();
    setActiveRequest(query);
    void interpret(query);
  }

  function handleClarification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = clarificationAnswer.trim();
    if (!answer) {
      setNotice("필요한 정보를 입력해주세요.");
      return;
    }
    const nextRequest = `${activeRequest}\n추가 정보: ${answer}`.trim();
    setActiveRequest(nextRequest);
    void interpret(nextRequest);
  }

  function saveDraft() {
    if (!draft) return;
    const button = createGeneratedButton(draft);
    const nextButtons = [button, ...savedButtons].slice(0, MAX_BUTTONS);
    setSavedButtons(nextButtons);
    window.localStorage.setItem(STORAGE_KEY, serializeGeneratedButtons(nextButtons));
    setDraft(null);
    setNotice(`${button.title} 버튼을 저장했습니다.`);
  }

  function deleteButton(id: string) {
    const nextButtons = savedButtons.filter((button) => button.id !== id);
    setSavedButtons(nextButtons);
    window.localStorage.setItem(STORAGE_KEY, serializeGeneratedButtons(nextButtons));
    setNotice("버튼을 삭제했습니다.");
  }

  async function runButton(button: GeneratedButton) {
    if (button.actionKind !== "weather") {
      window.location.href = button.actionKind === "bus_schedule" ? "/bus" : "/photo";
      return;
    }
    const city = typeof button.fixedInputs.city === "string" ? button.fixedInputs.city : "";
    if (!city) {
      setNotice("날씨 버튼에 도시 정보가 없어 실행할 수 없습니다.");
      return;
    }
    setRunningId(button.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { headers: { accept: "application/json" } });
      const payload = (await response.json()) as WeatherRunResponse;
      if (!response.ok || payload.status !== "OK") {
        setNotice("날씨 버튼을 실행하지 못했습니다.");
        return;
      }
      setNotice(`${payload.location.name} 현재 ${payload.current.condition}, ${payload.current.temperatureC.toFixed(1)}°C, 강수량 ${payload.current.precipitationMm.toFixed(1)}mm입니다.`);
    } catch {
      setNotice("날씨 버튼 실행 중 문제가 발생했습니다.");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <>
      <section className="create-tool" aria-labelledby="create-tool-title">
        <div className="create-tool-heading">
          <p className="eyebrow">자연어로 만드는 생활 버튼</p>
          <h2 id="create-tool-title">원하는 일을<br /><em>말로 설명해보세요.</em></h2>
          <p>지원하는 작업 안에서 AI가 버튼 초안을 만들고, 부족한 정보만 다시 물어봅니다.</p>
        </div>
        <form className="create-form" onSubmit={handleSubmit}>
          <label htmlFor="button-request">만들고 싶은 작업</label>
          <textarea id="button-request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="예: 인천 날씨 알려주는 버튼 만들어줘" maxLength={1000} />
          <div className="create-form-footer">
            <span>{request.length}/1,000</span>
            <button className="create-submit" type="submit" disabled={isLoading}>{isLoading ? "해석 중…" : "버튼 만들기"}</button>
          </div>
        </form>

        {notice && <p className="create-notice" role="status">{notice}</p>}

        {clarification && (
          <form className="create-clarify" onSubmit={handleClarification}>
            <p className="create-card-label">추가로 필요한 정보</p>
            <p className="create-question">{clarification.clarifyingQuestion}</p>
            <label htmlFor="button-clarification">추가 정보</label>
            <div className="create-clarify-row">
              <input id="button-clarification" value={clarificationAnswer} onChange={(event) => setClarificationAnswer(event.target.value)} autoComplete="off" />
              <button className="create-secondary" type="submit" disabled={isLoading}>이 정보로 계속</button>
            </div>
          </form>
        )}

        {draft && (
          <article className="create-draft" aria-labelledby="draft-title">
            <p className="create-card-label">생성된 버튼 초안</p>
            <h3 id="draft-title">{draft.title}</h3>
            <p>{draft.summary}</p>
            <dl className="create-draft-details">
              <div><dt>실행 작업</dt><dd>{draft.actionKind}</dd></div>
              <div><dt>고정 정보</dt><dd>{formatFixedInputs(draft.fixedInputs)}</dd></div>
              <div><dt>실행할 때 묻기</dt><dd>{draft.requiredInputs.length > 0 ? draft.requiredInputs.map((input) => input.label).join(", ") : "없음"}</dd></div>
            </dl>
            <button className="create-submit" type="button" onClick={saveDraft}>이 버튼 저장</button>
          </article>
        )}
      </section>

      <section className="create-saved" aria-labelledby="saved-buttons-title">
        <div className="create-saved-heading">
          <div>
            <p className="eyebrow">내가 만든 버튼</p>
            <h2 id="saved-buttons-title">다음에는<br />여기서 누르세요.</h2>
          </div>
          <span>{savedButtons.length}/{MAX_BUTTONS}</span>
        </div>
        {savedButtons.length > 0 ? (
          <ul className="create-saved-list">
            {savedButtons.map((button) => (
              <li key={button.id}>
                <button className="create-saved-button" type="button" aria-label={`${button.title} 실행`} onClick={() => void runButton(button)} disabled={runningId === button.id}>
                  <strong>{button.title}</strong>
                  <span>{button.summary}</span>
                  <small>{runningId === button.id ? "실행 중…" : "한 번 눌러 실행"}</small>
                </button>
                <button className="create-delete" type="button" aria-label={`${button.title} 삭제`} onClick={() => deleteButton(button.id)}>삭제</button>
              </li>
            ))}
          </ul>
        ) : <p className="create-saved-empty">아직 만든 버튼이 없습니다. 위에서 원하는 일을 말해보세요.</p>}
      </section>
    </>
  );
}
