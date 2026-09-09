import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

describe("GET /api/tago/grades", () => {
  afterEach(() => {
    delete process.env.TAGO_SERVICE_KEY;
    vi.unstubAllGlobals();
  });

  it("버스등급 결과를 반환한다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00" },
              body: { totalCount: 2, items: { item: [{ gradeId: "1", gradeNm: "고속" }, { gradeId: "2", gradeNm: "우등" }] } },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await GET(new Request("http://localhost/api/tago/grades"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "OK",
      totalCount: 2,
      items: [{ id: "1", name: "고속" }, { id: "2", name: "우등" }],
      source: { provider: "TAGO", resource: "grades" },
    });
  });
});
