import {
  createTagoClient,
  TagoUpstreamError,
  type TagoLookupQuery,
  type TagoLookupResult,
} from "@hanbeonman/connectors";

const MAX_REQUEST_MS = 30_000;

export type TagoLookupResource = "terminals" | "grades" | "cities";

type QueryParseResult =
  | { success: true; data: TagoLookupQuery }
  | { success: false; message: string };

function parseQuery(
  searchParams: URLSearchParams,
  resource: TagoLookupResource,
): QueryParseResult {
  const query: TagoLookupQuery = {};
  const terminalNm = searchParams.get("terminalNm")?.trim();
  if (terminalNm) {
    if (resource !== "terminals" || terminalNm.length > 64) {
      return { success: false, message: "조회 조건 형식이 올바르지 않습니다." };
    }
    query.terminalNm = terminalNm;
  }

  for (const key of ["pageNo", "numOfRows"] as const) {
    const rawValue = searchParams.get(key);
    if (rawValue === null || rawValue === "") continue;
    const value = Number(rawValue);
    const max = key === "pageNo" ? 1000 : 100;
    if (!Number.isInteger(value) || value < 1 || value > max) {
      return { success: false, message: "페이지 조건 형식이 올바르지 않습니다." };
    }
    query[key] = value;
  }

  return { success: true, data: query };
}

function invalidInput(message: string): Response {
  return Response.json(
    { status: "INVALID_INPUT", error: { code: "INVALID_INPUT", message } },
    { status: 400 },
  );
}

function upstreamFailure(error: TagoUpstreamError): Response {
  const needsAttention =
    error.code === "UPSTREAM_CONTRACT" || error.code.startsWith("PROVIDER_");
  return Response.json(
    {
      status: needsAttention ? "NEEDS_ATTENTION" : "FAILED",
      error: {
        code: error.code,
        message: needsAttention
          ? "TAGO 조회를 확인해야 합니다."
          : "TAGO 조회에 실패했습니다. 같은 조건으로 다시 시도해주세요.",
      },
    },
    { status: 502 },
  );
}

async function lookup(
  client: ReturnType<typeof createTagoClient>,
  resource: TagoLookupResource,
  query: TagoLookupQuery,
): Promise<TagoLookupResult> {
  if (resource === "terminals") return client.getTerminals(query);
  if (resource === "grades") return client.getGrades(query);
  return client.getCities(query);
}

export async function handleTagoLookup(
  resource: TagoLookupResource,
  request: Request,
): Promise<Response> {
  const queryResult = parseQuery(new URL(request.url).searchParams, resource);
  if (!queryResult.success) return invalidInput(queryResult.message);

  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim();
  if (!serviceKey) {
    return Response.json(
      {
        status: "NEEDS_ATTENTION",
        error: {
          code: "NOT_CONFIGURED",
          message: "TAGO 연동 키가 아직 설정되지 않았습니다.",
        },
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);
  const client = createTagoClient({
    serviceKey,
    fetchImpl: (input, init) =>
      fetch(input, { ...init, signal: controller.signal }),
  });

  try {
    const result = await lookup(client, resource, queryResult.data);
    return Response.json({
      ...result,
      fetchedAt: new Date().toISOString(),
      source: { provider: "TAGO", resource },
    });
  } catch (error) {
    if (error instanceof TagoUpstreamError) return upstreamFailure(error);
    return Response.json(
      {
        status: "FAILED",
        error: {
          code: "INTERNAL_ERROR",
          message: "조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
