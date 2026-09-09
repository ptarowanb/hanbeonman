import { z } from "zod";

const TAGO_DEFAULT_BASE_URL = "https://apis.data.go.kr/1613000/ExpBusInfo";
const TAGO_OPERATION = "GetStrtpntAlocFndExpbusInfo";

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

function normalizeItems(item: TagoItem | TagoItem[] | undefined): TagoItem[] {
  if (!item) return [];
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

export function createTagoClient({
  serviceKey,
  fetchImpl = fetch,
  baseUrl,
}: TagoClientOptions): TagoClient {
  if (!serviceKey.trim()) throw new Error("TAGO 서비스 키가 설정되지 않았습니다.");

  return {
    async getSchedules(query) {
      const url = buildTagoScheduleUrl(query, serviceKey, baseUrl);
      let response: Response;
      try {
        response = await fetchImpl(url, { headers: { accept: "application/json" } });
      } catch {
        throw new TagoUpstreamError("NETWORK_ERROR", "TAGO에 연결하지 못했습니다.");
      }
      if (!response.ok) {
        throw new TagoUpstreamError(`HTTP_${response.status}`, "TAGO 조회에 실패했습니다.");
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new TagoUpstreamError("UPSTREAM_CONTRACT", "TAGO 응답을 읽지 못했습니다.");
      }
      return parseTagoScheduleResponse(payload);
    },
  };
}
