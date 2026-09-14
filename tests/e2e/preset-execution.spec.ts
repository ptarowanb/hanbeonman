import { expect, test, type Page } from "@playwright/test";

async function mockBusLists(page: Page) {
  await page.route("**/api/tago/terminals**", async (route) => {
    await route.fulfill({ json: { status: "OK", totalCount: 4, items: [
      { id: "NAEK010", name: "서울경부" }, { id: "NAEK300", name: "대전복합" },
      { id: "NAEK200", name: "부산" }, { id: "NAEK210", name: "부산사상" },
    ] } });
  });
  await page.route("**/api/tago/grades**", async (route) => {
    await route.fulfill({ json: { status: "OK", totalCount: 2, items: [
      { id: "1", name: "고속" }, { id: "2", name: "우등" },
    ] } });
  });
}

test("저장한 버스 조건을 복원해 한국 기준 요일로 한 번 조회한다", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-13T15:30:00.000Z"));
  await mockBusLists(page);
  const queries: URLSearchParams[] = [];
  await page.route("**/api/tago/schedules**", async (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    await route.fulfill({ json: { status: "EMPTY", totalCount: 0, schedules: [] } });
  });
  await page.goto("/bus?departure=서울&arrival=대전&grade=우등&weekday=5&auto=1");
  await expect(page.getByRole("status")).toContainText("조건에 맞는 시간표가 없습니다.");
  await expect(page.getByRole("combobox", { name: "출발 터미널" })).toHaveValue("NAEK010");
  await expect(page.getByRole("combobox", { name: "도착 터미널" })).toHaveValue("NAEK300");
  await expect(page.getByRole("combobox", { name: "버스 등급" })).toHaveValue("2");
  await expect(page.getByLabel("출발일")).toHaveValue("2026-09-18");
  expect(queries).toHaveLength(1);
  expect(queries[0]?.get("busGradeId")).toBe("2");
  expect(queries[0]?.get("depPlandTime")).toBe("20260918");
});

test("불명확한 터미널과 없는 등급은 선택을 요구하고 자동 조회하지 않는다", async ({ page }) => {
  await mockBusLists(page);
  const queries: string[] = [];
  await page.route("**/api/tago/schedules**", async (route) => {
    queries.push(route.request().url());
    await route.fulfill({ json: { status: "EMPTY", totalCount: 0, schedules: [] } });
  });
  await page.goto("/bus?departure=부&arrival=대전&grade=프리미엄&auto=1");
  await expect(page.getByRole("status")).toContainText("출발 터미널");
  await expect(page.getByRole("combobox", { name: "출발 터미널" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "버스 등급" })).toHaveValue("__unresolved__");
  expect(queries).toHaveLength(0);
  await page.getByRole("combobox", { name: "출발 터미널" }).selectOption("NAEK200");
  await page.getByRole("button", { name: "시간표 조회", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("버스 등급");
  expect(queries).toHaveLength(0);
  await page.getByRole("combobox", { name: "버스 등급" }).selectOption("2");
  await page.getByRole("button", { name: "시간표 조회", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("조건에 맞는 시간표가 없습니다.");
  expect(queries).toHaveLength(1);
});

test("사진 버튼의 크기와 품질을 복원하고 사진 선택을 기다린다", async ({ page }) => {
  await page.goto("/photo?maxEdge=1280&quality=0.75");
  await expect(page.getByLabel("긴 변 (px)")).toHaveValue("1280");
  await expect(page.getByLabel("JPEG 품질")).toHaveValue("0.75");
  await expect(page.getByRole("button", { name: "사진 변환하고 ZIP 만들기" })).toBeDisabled();
});

test("잘못된 사진 링크 설정은 오류를 표시하고 안전한 기본값을 유지한다", async ({ page }) => {
  await page.goto("/photo?maxEdge=100000&quality=0");
  await expect(page.getByRole("status")).toContainText("320");
  await expect(page.getByLabel("긴 변 (px)")).toHaveValue("1600");
  await expect(page.getByLabel("JPEG 품질")).toHaveValue("0.82");
});
