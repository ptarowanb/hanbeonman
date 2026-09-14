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
        current: { observedAt: "2026-09-10T12:00", temperatureC: 25.4, precipitationMm: 0, weatherCode: 1, condition: "대체로 맑음" },
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

test("인천 빠른 선택을 제공하고 부산 이름을 한글로 표시한다", async ({ page }) => {
  await page.route("**/api/weather**", async (route) => {
    const city = new URL(route.request().url()).searchParams.get("city") ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        location: { name: city, latitude: 35.1796, longitude: 129.0756 },
        current: { observedAt: "2026-09-10T12:00", temperatureC: 27.1, precipitationMm: 0, weatherCode: 0, condition: "맑음" },
        fetchedAt: "2026-09-10T03:00:00.000Z",
        source: { provider: "Open-Meteo" },
      }),
    });
  });

  await page.goto("/weather");
  await expect(page.getByRole("button", { name: "인천" })).toBeVisible();
  await page.getByRole("button", { name: "부산" }).click();

  await expect(page.getByRole("status")).toContainText("부산 현재 날씨");
  await expect(page.getByText("부산 현재 날씨", { exact: true })).toBeVisible();
});

test("날씨 상태와 오늘 예보를 외출 준비 카드로 보여준다", async ({ page }) => {
  await page.route("**/api/weather**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "OK", location: { name: "인천" },
      current: { observedAt: "2026-09-14T12:00", temperatureC: 24.1, precipitationMm: 0, weatherCode: 3, condition: "흐림", feelsLikeC: 26.2, humidityPercent: 78, windSpeedKmh: 14.2 },
      today: { date: "2026-09-14", minC: 20.2, maxC: 28.1, precipitationProbability: 75 },
      fetchedAt: "2026-09-14T03:01:00.000Z", source: { provider: "Open-Meteo" },
    }),
  }));
  await page.goto("/weather");
  await page.getByRole("button", { name: "인천" }).click();
  const card = page.getByRole("article", { name: "인천 현재 날씨" });
  await expect(card.getByText("흐림", { exact: true })).toBeVisible();
  await expect(card.getByText("26.2°C", { exact: true })).toBeVisible();
  await expect(card.getByText("78%", { exact: true })).toBeVisible();
  await expect(card.getByText("14.2 km/h", { exact: true })).toBeVisible();
  await expect(card.getByText("20.2°C", { exact: true })).toBeVisible();
  await expect(card.getByText("28.1°C", { exact: true })).toBeVisible();
  await expect(card.getByText("75%", { exact: true })).toBeVisible();
  await expect(card.getByText(/우산을 챙겨/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("추가 예보가 없으면 수치를 꾸며내지 않고 현재 상태를 보여준다", async ({ page }) => {
  await page.route("**/api/weather**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ status: "OK", location: { name: "서울" }, current: { observedAt: "2026-09-14T12:00", temperatureC: 25, precipitationMm: 0, weatherCode: 0, condition: "맑음" }, fetchedAt: "2026-09-14T03:01:00.000Z", source: { provider: "Open-Meteo" } }),
  }));
  await page.goto("/weather");
  await page.getByRole("button", { name: "서울" }).click();
  await expect(page.getByText("오늘 예보를 받아오지 못했습니다.")).toBeVisible();
  await expect(page.getByText("맑음", { exact: true })).toBeVisible();
  await expect(page.getByText("체감온도", { exact: true })).toHaveCount(0);
});
