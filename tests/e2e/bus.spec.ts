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
