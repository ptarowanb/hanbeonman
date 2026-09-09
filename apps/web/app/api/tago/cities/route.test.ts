import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

describe("GET /api/tago/cities", () => {
  afterEach(() => {
    delete process.env.TAGO_SERVICE_KEY;
    vi.unstubAllGlobals();
  });

  it("도시 코드가 없으면 EMPTY를 구분한다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00" },
              body: { totalCount: 0, items: { item: [] } },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await GET(new Request("http://localhost/api/tago/cities"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "EMPTY",
      totalCount: 0,
      items: [],
      source: { provider: "TAGO", resource: "cities" },
    });
  });
});
