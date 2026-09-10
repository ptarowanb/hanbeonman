import { expect, test, type Page } from "@playwright/test";

async function mockLookupLists(page: Page) {
  await page.route("**/api/tago/terminals**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        totalCount: 3,
        items: [
          { id: "NAEK010", name: "서울경부" },
          { id: "NAEK300", name: "대전복합" },
          { id: "NAEK200", name: "부산" },
        ],
        source: { provider: "TAGO", resource: "terminals" },
      }),
    });
  });
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
}

test("터미널 목록을 미리 불러와 출발지와 도착지를 드롭다운으로 선택한다", async ({ page }) => {
  await mockLookupLists(page);
  await page.goto("/bus");

  const departure = page.getByRole("combobox", { name: "출발 터미널" });
  const arrival = page.getByRole("combobox", { name: "도착 터미널" });
  await expect(departure).toBeVisible();
  await expect(departure.locator("option")).toHaveCount(4);
  await departure.selectOption("NAEK010");
  await arrival.selectOption("NAEK300");

  await expect(departure).toHaveValue("NAEK010");
  await expect(arrival).toHaveValue("NAEK300");
  await expect(page.getByText("터미널 ID를 직접 입력하지 않고 TAGO 공개 목록에서 선택합니다.")).toBeVisible();
});

test("버스 등급 목록을 미리 불러와 드롭다운으로 시간표 조건에 반영한다", async ({ page }) => {
  await mockLookupLists(page);
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
  await page.getByRole("combobox", { name: "출발 터미널" }).selectOption("NAEK010");
  await page.getByRole("combobox", { name: "도착 터미널" }).selectOption("NAEK300");
  await page.getByRole("combobox", { name: "버스 등급" }).selectOption("2");
  await page.getByLabel("출발일").fill("2026-09-10");
  await page.getByRole("button", { name: "시간표 조회" }).click();

  await expect(page.getByRole("status")).toContainText("조건에 맞는 시간표가 없습니다.");
});

test("시간표 연동 오류를 화면에 안내한다", async ({ page }) => {
  await mockLookupLists(page);
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
  await page.getByRole("combobox", { name: "출발 터미널" }).selectOption("NAEK010");
  await page.getByRole("combobox", { name: "도착 터미널" }).selectOption("NAEK300");
  await page.getByLabel("출발일").fill("2026-09-10");
  await page.getByRole("button", { name: "시간표 조회" }).click();

  await expect(page.getByRole("status")).toContainText("TAGO 연동 키가 아직 설정되지 않았습니다.");
  await expect(page.getByText("예약·결제·잔여석은 제공하지 않습니다.")).toBeVisible();
});
