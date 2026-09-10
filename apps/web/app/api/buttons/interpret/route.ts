import { GeminiError, interpretButtonRequest } from "@hanbeonman/connectors";

export const runtime = "nodejs";

const MAX_REQUEST_CHARS = 1_000;
const MAX_REQUEST_MS = 8_000;

function invalidInput(): Response {
  return Response.json(
    { status: "INVALID_INPUT", error: { code: "INVALID_INPUT", message: "만들고 싶은 작업을 입력해주세요." } },
    { status: 400 },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidInput();
  }

  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string"
    ? body.message.trim()
    : "";
  if (!message || message.length > MAX_REQUEST_CHARS) return invalidInput();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim();
    const fetchImpl = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: controller.signal });
    const options = apiKey
      ? model ? { apiKey, model, fetchImpl } : { apiKey, fetchImpl }
      : { fetchImpl };
    return Response.json(await interpretButtonRequest(message, options));
  } catch (error) {
    if (error instanceof GeminiError) {
      if (error.code === "INVALID_INPUT") return invalidInput();
      if (error.code === "NOT_CONFIGURED") {
        return Response.json(
          { status: "NEEDS_ATTENTION", error: { code: error.code, message: "Gemini 연동 키가 아직 설정되지 않았습니다." } },
          { status: 503 },
        );
      }
      return Response.json(
        { status: "FAILED", error: { code: error.code, message: "버튼 요청을 해석하지 못했습니다. 잠시 후 다시 시도해주세요." } },
        { status: 502 },
      );
    }
    return Response.json(
      { status: "FAILED", error: { code: "INTERNAL_ERROR", message: "버튼 요청 처리 중 문제가 발생했습니다." } },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
