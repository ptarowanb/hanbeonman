import { expect, test } from "@playwright/test";

test("고속버스 조회 화면이 조건을 입력받고 연동 상태를 안내한다", async ({ page }) => {
  await page.route("**/api/tago/schedules**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        status: "NEEDS_ATTENTION",
        error: { code: "NOT_CONFIGURED", message: "TAGO 연동 키가 아직 설정되지 않았습니다." },
      }),
    });
  });

  await page.goto("/bus");
  await expect(page.getByRole("heading", { name: "고속버스 시간표를" })).toBeVisible();
  await page.getByLabel("출발 터미널 ID").fill("NAEK010");
  await page.getByLabel("도착 터미널 ID").fill("NAEK300");
  await page.getByLabel("출발일").fill("2026-09-10");
  await page.getByRole("button", { name: "시간표 조회" }).click();

  await expect(page.getByRole("status")).toContainText("TAGO 연동 키가 아직 설정되지 않았습니다.");
  await expect(page.getByText("예약·결제·잔여석은 제공하지 않습니다.")).toBeVisible();
});

test("터미널 이름 검색 결과를 선택하면 TAGO 코드가 입력된다", async ({ page }) => {
  await page.route("**/api/tago/terminals**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        totalCount: 1,
        items: [{ id: "NAEK010", name: "서울경부" }],
        source: { provider: "TAGO", resource: "terminals" },
      }),
    });
  });

  await page.goto("/bus");
  await page.getByRole("button", { name: "출발 터미널 검색" }).click();
  await page.getByLabel("출발 터미널 이름").fill("서울");
  await page.getByRole("button", { name: "출발 터미널 찾기" }).click();
  await page.getByRole("button", { name: "서울경부 · NAEK010" }).click();

  await expect(page.getByLabel("출발 터미널 ID")).toHaveValue("NAEK010");
});

test("버스등급 검색 결과를 선택하면 시간표 조건에 반영된다", async ({ page }) => {
  await page.route("**/api/tago/grades**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        totalCount: 2,
        items: [{ id: "1", name: "고속" }, { id: "2", name: "우등" }],
        source: { provider: "TAGO", resource: "grades" },
      }),
    });
  });
  await page.route("**/api/tago/schedules**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("busGradeId") !== "2") {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ status: "INVALID_INPUT" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "EMPTY", totalCount: 0, schedules: [] }),
    });
  });

  await page.goto("/bus");
  await page.getByRole("button", { name: "버스등급 검색" }).click();
  await page.getByRole("button", { name: "버스등급 찾기" }).click();
  await page.getByRole("button", { name: "우등 · 2" }).click();
  await page.getByLabel("출발일").fill("2026-09-10");
  await page.getByRole("button", { name: "시간표 조회" }).click();

  await expect(page.getByRole("status")).toContainText("조건에 맞는 시간표가 없습니다.");
});
