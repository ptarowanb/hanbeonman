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

  await page.getByRole("button", { name: "출발 터미널 검색" }).click();
  await page.getByLabel("출발 터미널 이름 검색").fill("대전");
  await expect(page.getByRole("button", { name: "대전복합 · NAEK300" })).toBeVisible();
  await page.getByRole("button", { name: "대전복합 · NAEK300" }).click();

  await expect(departure).toHaveValue("NAEK300");
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

test("조회 조건을 저장해 다음부터 버튼 한 번으로 오늘 시간표를 조회한다", async ({ page }) => {
  await mockLookupLists(page);
  let requestParams: URLSearchParams | null = null;
  await page.route("**/api/tago/schedules**", async (route) => {
    requestParams = new URL(route.request().url()).searchParams;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        totalCount: 1,
        schedules: [{
          routeId: "R-1",
          gradeName: "우등",
          departureTime: "202609101030",
          arrivalTime: "202609101230",
          departurePlace: "서울경부",
          arrivalPlace: "대전복합",
          fare: 12300,
        }],
        fetchedAt: "2026-09-10T03:00:00.000Z",
        source: { provider: "TAGO", reservationsSupported: false },
      }),
    });
  });

  await page.goto("/bus");
  await page.getByRole("combobox", { name: "출발 터미널" }).selectOption("NAEK010");
  await page.getByRole("combobox", { name: "도착 터미널" }).selectOption("NAEK300");
  await page.getByLabel("저장할 버튼 이름").fill("금요일 대전 출장");
  await page.getByRole("button", { name: "조건을 버튼으로 저장" }).click();
  await expect(page.getByRole("status")).toContainText("금요일 대전 출장 버튼을 저장했습니다.");

  await page.reload();
  const savedButton = page.getByRole("button", { name: "금요일 대전 출장", exact: true });
  await expect(savedButton).toBeVisible();
  await savedButton.click();

  await expect(page.getByRole("status")).toContainText("1개 시간표를 확인했습니다.");
  await expect(page.getByText("10:30")).toBeVisible();
  expect(requestParams?.get("depTerminalId")).toBe("NAEK010");
  expect(requestParams?.get("arrTerminalId")).toBe("NAEK300");
  expect(requestParams?.get("depPlandTime")).toMatch(/^\d{8}$/);
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
