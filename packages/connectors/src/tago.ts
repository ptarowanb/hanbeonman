import { z } from "zod";

const TAGO_DEFAULT_BASE_URL = "https://apis.data.go.kr/1613000/ExpBusInfo";
const TAGO_OPERATION = "GetStrtpntAlocFndExpbusInfo";
const TAGO_LOOKUP_OPERATIONS = {
  terminals: "GetExpBusTrminlList",
  grades: "GetExpBusGradList",
  cities: "GetCtyCodeList",
} as const;

const TagoScheduleQuerySchema = z
  .object({
    depTerminalId: z.string().trim().min(1).max(32),
    arrTerminalId: z.string().trim().min(1).max(32),
    depPlandTime: z.string().regex(/^\d{8}$/, "YYYYMMDD 형식이어야 합니다."),
    busGradeId: z.string().trim().min(1).max(16).optional(),
    pageNo: z.number().int().min(1).max(1000).optional(),
    numOfRows: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export type TagoScheduleQuery = z.infer<typeof TagoScheduleQuerySchema>;

export type TagoSchedule = {
  routeId: string;
  gradeName: string;
  departureTime: string;
  arrivalTime: string;
  departurePlace: string;
  arrivalPlace: string;
  fare: number;
};

export type TagoScheduleResult =
  | { status: "OK"; totalCount: number; schedules: TagoSchedule[] }
  | { status: "EMPTY"; totalCount: 0; schedules: [] };

export type TagoLookupQuery = {
  terminalNm?: string;
  pageNo?: number;
  numOfRows?: number;
};

export type TagoLookupItem = { id: string; name: string };

export type TagoLookupResult =
  | { status: "OK"; totalCount: number; items: TagoLookupItem[] }
  | { status: "EMPTY"; totalCount: 0; items: [] };

export type TagoFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class TagoUpstreamError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TagoUpstreamError";
  }
}

type TagoClientOptions = {
  serviceKey: string;
  fetchImpl?: TagoFetch;
  baseUrl?: string;
};

type TagoClient = {
  getSchedules: (query: TagoScheduleQuery) => Promise<TagoScheduleResult>;
  getTerminals: (query: TagoLookupQuery) => Promise<TagoLookupResult>;
  getGrades: (query: TagoLookupQuery) => Promise<TagoLookupResult>;
  getCities: (query: TagoLookupQuery) => Promise<TagoLookupResult>;
};

const responseSchema = z
  .object({
    response: z
      .object({
        header: z.object({
          resultCode: z.union([z.string(), z.number()]),
          resultMsg: z.string().optional(),
        }),
        body: z
          .object({
            totalCount: z.union([z.string(), z.number()]).optional(),
            items: z
              .object({
                item: z
                  .union([
                    z.object({
                      routeId: z.string(),
                      gradeNm: z.string(),
                      depPlandTime: z.union([z.string(), z.number()]),
                      arrPlandTime: z.union([z.string(), z.number()]),
                      depPlaceNm: z.string(),
                      arrPlaceNm: z.string(),
                      charge: z.union([z.string(), z.number()]),
                    }),
                    z.array(
                      z.object({
                        routeId: z.string(),
                        gradeNm: z.string(),
                        depPlandTime: z.union([z.string(), z.number()]),
                        arrPlandTime: z.union([z.string(), z.number()]),
                        depPlaceNm: z.string(),
                        arrPlaceNm: z.string(),
                        charge: z.union([z.string(), z.number()]),
                      }),
                    ),
                  ])
                  .optional(),
              })
              .optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

type TagoItem = {
  routeId: string;
  gradeNm: string;
  depPlandTime: string | number;
  arrPlandTime: string | number;
  depPlaceNm: string;
  arrPlaceNm: string;
  charge: string | number;
};

const lookupResponseSchema = z
  .object({
    response: z
      .object({
        header: z.object({
          resultCode: z.union([z.string(), z.number()]),
          resultMsg: z.string().optional(),
        }),
        body: z
          .object({
            totalCount: z.union([z.string(), z.number()]).optional(),
            items: z
              .object({ item: z.unknown().optional() })
              .optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

const terminalLookupItemSchema = z
  .object({
    terminalId: z.union([z.string(), z.number()]),
    terminalNm: z.string(),
  })
  .passthrough();

const gradeLookupItemSchema = z
  .object({
    gradeId: z.union([z.string(), z.number()]),
    gradeNm: z.string(),
  })
  .passthrough();

const cityLookupItemSchema = z
  .object({
    cityCode: z.union([z.string(), z.number()]),
    cityName: z.string(),
  })
  .passthrough();

function normalizeItems(item: TagoItem | TagoItem[] | undefined): TagoItem[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function normalizeUnknownItems(item: unknown): unknown[] {
  if (item === undefined || item === null) return [];
  return Array.isArray(item) ? item : [item];
}

function normalizeServiceKey(serviceKey: string): string {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}

function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 요금 필드가 올바르지 않습니다.");
  }
  return parsed;
}

export function buildTagoScheduleUrl(
  query: TagoScheduleQuery,
  serviceKey: string,
  baseUrl = TAGO_DEFAULT_BASE_URL,
): URL {
  const parsedQuery = TagoScheduleQuerySchema.parse(query);
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${TAGO_OPERATION}`);
  url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
  url.searchParams.set("numOfRows", String(parsedQuery.numOfRows ?? 10));
  url.searchParams.set("pageNo", String(parsedQuery.pageNo ?? 1));
  url.searchParams.set("_type", "json");
  url.searchParams.set("depTerminalId", parsedQuery.depTerminalId);
  url.searchParams.set("arrTerminalId", parsedQuery.arrTerminalId);
  url.searchParams.set("depPlandTime", parsedQuery.depPlandTime);
  if (parsedQuery.busGradeId) url.searchParams.set("busGradeId", parsedQuery.busGradeId);
  return url;
}

export function parseTagoScheduleResponse(payload: unknown): TagoScheduleResult {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 응답 형식이 바뀌었습니다.");
  }

  const resultCode = String(parsed.data.response.header.resultCode).padStart(2, "0");
  if (resultCode !== "00") {
    throw new TagoUpstreamError(`PROVIDER_${resultCode}`, "TAGO 조회가 거부되었습니다.");
  }

  const body = parsed.data.response.body;
  const items = normalizeItems(body.items?.item as TagoItem | TagoItem[] | undefined);
  const totalCount = body.totalCount === undefined ? items.length : Number(body.totalCount);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 결과 건수가 올바르지 않습니다.");
  }
  if (items.length === 0) return { status: "EMPTY", totalCount: 0, schedules: [] };

  return {
    status: "OK",
    totalCount,
    schedules: items.map((item) => ({
      routeId: item.routeId,
      gradeName: item.gradeNm,
      departureTime: String(item.depPlandTime),
      arrivalTime: String(item.arrPlandTime),
      departurePlace: item.depPlaceNm,
      arrivalPlace: item.arrPlaceNm,
      fare: toNumber(item.charge),
    })),
  };
}

type TagoLookupKind = keyof typeof TAGO_LOOKUP_OPERATIONS;

function parseTagoLookupResponse(
  payload: unknown,
  kind: TagoLookupKind,
): TagoLookupResult {
  const parsed = lookupResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 응답 형식이 바뀌었습니다.");
  }

  const resultCode = String(parsed.data.response.header.resultCode).padStart(2, "0");
  if (resultCode !== "00") {
    throw new TagoUpstreamError(`PROVIDER_${resultCode}`, "TAGO 조회가 거부되었습니다.");
  }

  const rawItems = normalizeUnknownItems(parsed.data.response.body.items?.item);
  const itemSchema =
    kind === "terminals"
      ? terminalLookupItemSchema
      : kind === "grades"
        ? gradeLookupItemSchema
        : cityLookupItemSchema;
  const items = rawItems.map((item) => {
    const result = itemSchema.safeParse(item);
    if (!result.success) {
      throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 코드 응답 형식이 바뀌었습니다.");
    }
    if (kind === "terminals") {
      const value = result.data as { terminalId: string | number; terminalNm: string };
      return { id: String(value.terminalId), name: value.terminalNm };
    }
    if (kind === "grades") {
      const value = result.data as { gradeId: string | number; gradeNm: string };
      return { id: String(value.gradeId), name: value.gradeNm };
    }
    const value = result.data as { cityCode: string | number; cityName: string };
    return { id: String(value.cityCode), name: value.cityName };
  });
  if (items.length === 0) return { status: "EMPTY", totalCount: 0, items: [] };

  const totalCount = parsed.data.response.body.totalCount === undefined
    ? items.length
    : Number(parsed.data.response.body.totalCount);
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 결과 건수가 올바르지 않습니다.");
  }
  return { status: "OK", totalCount, items };
}

export function buildTagoLookupUrl(
  kind: TagoLookupKind,
  query: TagoLookupQuery,
  serviceKey: string,
  baseUrl = TAGO_DEFAULT_BASE_URL,
): URL {
  const parsedQuery = z
    .object({
      terminalNm: z.string().trim().min(1).max(64).optional(),
      pageNo: z.number().int().min(1).max(1000).optional(),
      numOfRows: z.number().int().min(1).max(100).optional(),
    })
    .strict()
    .parse(query);
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${TAGO_LOOKUP_OPERATIONS[kind]}`);
  url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
  url.searchParams.set("numOfRows", String(parsedQuery.numOfRows ?? 100));
  url.searchParams.set("pageNo", String(parsedQuery.pageNo ?? 1));
  url.searchParams.set("_type", "json");
  if (parsedQuery.terminalNm) url.searchParams.set("terminalNm", parsedQuery.terminalNm);
  return url;
}

export function parseTagoTerminalResponse(payload: unknown): TagoLookupResult {
  return parseTagoLookupResponse(payload, "terminals");
}

export function parseTagoGradeResponse(payload: unknown): TagoLookupResult {
  return parseTagoLookupResponse(payload, "grades");
}

export function parseTagoCityResponse(payload: unknown): TagoLookupResult {
  return parseTagoLookupResponse(payload, "cities");
}

export function createTagoClient({
  serviceKey,
  fetchImpl = fetch,
  baseUrl,
}: TagoClientOptions): TagoClient {
  if (!serviceKey.trim()) throw new Error("TAGO 서비스 키가 설정되지 않았습니다.");

  async function fetchJson(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { accept: "application/json" } });
    } catch {
      throw new TagoUpstreamError("NETWORK_ERROR", "TAGO에 연결하지 못했습니다.");
    }
    if (!response.ok) {
      throw new TagoUpstreamError(`HTTP_${response.status}`, "TAGO 조회에 실패했습니다.");
    }
    try {
      return await response.json();
    } catch {
      throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 응답을 읽지 못했습니다.");
    }
  }

  return {
    async getSchedules(query) {
      const url = buildTagoScheduleUrl(query, serviceKey, baseUrl);
      return parseTagoScheduleResponse(await fetchJson(url));
    },
    async getTerminals(query) {
      return parseTagoTerminalResponse(
        await fetchJson(buildTagoLookupUrl("terminals", query, serviceKey, baseUrl)),
      );
    },
    async getGrades(query) {
      return parseTagoGradeResponse(
        await fetchJson(buildTagoLookupUrl("grades", query, serviceKey, baseUrl)),
      );
    },
    async getCities(query) {
      return parseTagoCityResponse(
        await fetchJson(buildTagoLookupUrl("cities", query, serviceKey, baseUrl)),
      );
    },
  };
}
