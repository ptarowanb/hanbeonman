import { expect, test } from "@playwright/test";

test("도시 버튼을 누르면 현재 날씨를 바로 확인한다", async ({ page }) => {
  await page.route("**/api/weather**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("city")).toBe("서울");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        location: { name: "서울", latitude: 37.5665, longitude: 126.978 },
        current: { observedAt: "2026-09-10T12:00", temperatureC: 25.4, precipitationMm: 0, weatherCode: 1 },
        fetchedAt: "2026-09-10T03:00:00.000Z",
        source: { provider: "Open-Meteo" },
      }),
    });
  });

  await page.goto("/weather");
  await page.getByRole("button", { name: "서울" }).click();

  await expect(page.getByRole("status")).toContainText("서울 현재 날씨");
  await expect(page.getByText("25.4°C")).toBeVisible();
  await expect(page.getByText("대체로 맑음")).toBeVisible();
});
