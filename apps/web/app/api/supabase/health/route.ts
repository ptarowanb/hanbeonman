export const runtime = "nodejs";

const MAX_REQUEST_MS = 5_000;

function notConfigured(): Response {
  return Response.json(
    {
      status: "NEEDS_ATTENTION",
      error: {
        code: "NOT_CONFIGURED",
        message: "Supabase 서버 연결 설정이 아직 없습니다.",
      },
    },
    { status: 503 },
  );
}

export async function GET(): Promise<Response> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!projectUrl || !secretKey) return notConfigured();

  let endpoint: URL;
  try {
    endpoint = new URL("/rest/v1/buttons?select=id&limit=1", projectUrl);
    if (endpoint.protocol !== "https:") return notConfigured();
  } catch {
    return notConfigured();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return Response.json(
        {
          status: "FAILED",
          error: { code: `HTTP_${response.status}`, message: "Supabase 연결을 확인하지 못했습니다." },
        },
        { status: 502 },
      );
    }
    return Response.json({
      status: "OK",
      checkedAt: new Date().toISOString(),
      source: { provider: "SUPABASE", resource: "buttons" },
    });
  } catch {
    return Response.json(
      {
        status: "FAILED",
        error: { code: "NETWORK_ERROR", message: "Supabase 연결을 확인하지 못했습니다." },
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
