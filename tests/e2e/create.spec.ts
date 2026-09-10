import { expect, test } from "@playwright/test";

test("자연어 요청으로 날씨 버튼 초안을 만들고 저장한다", async ({ page }) => {
  await page.route("**/api/buttons/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        intent: "create_button",
        schemaVersion: "1.0",
        actionKind: "weather",
        title: "인천 날씨 확인",
        summary: "인천의 현재 날씨를 조회합니다.",
        fixedInputs: { city: "인천" },
        requiredInputs: [],
        clarifyingQuestion: null,
      }),
    });
  });

  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("인천 날씨 알려주는 버튼 만들어줘");
  await page.getByRole("button", { name: "버튼 만들기" }).click();

  await expect(page.getByText("인천 날씨 확인", { exact: true })).toBeVisible();
  await expect(page.getByText("고정 정보", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "이 버튼 저장" }).click();

  await expect(page.getByRole("status")).toContainText("인천 날씨 확인 버튼을 저장했습니다");
  await expect(page.getByRole("button", { name: "인천 날씨 확인 실행" })).toBeVisible();
});

test("도시와 날씨만 입력해도 날씨 버튼 초안을 만든다", async ({ page }) => {
  await page.route("**/api/buttons/interpret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        intent: "create_button",
        schemaVersion: "1.0",
        actionKind: "weather",
        title: "인천 날씨 조회",
        summary: "인천의 현재 기온과 날씨를 확인합니다.",
        fixedInputs: { city: "인천" },
        requiredInputs: [],
        clarifyingQuestion: null,
      }),
    });
  });

  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("인천 날씨");
  await page.getByRole("button", { name: "버튼 만들기" }).click();

  await expect(page.getByRole("heading", { name: "인천 날씨 조회" })).toBeVisible();
});

test("필수 정보가 빠지면 질문에 답한 뒤 다시 해석한다", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/buttons/interpret", async (route) => {
    calls += 1;
    const body = calls === 1
      ? {
          intent: "clarify",
          schemaVersion: "1.0",
          actionKind: "weather",
          title: "날씨 확인",
          summary: "도시의 현재 날씨를 조회합니다.",
          fixedInputs: {},
          requiredInputs: [{ key: "city", label: "날씨를 확인할 도시", type: "city", required: true }],
          clarifyingQuestion: "어느 도시의 날씨를 확인할까요?",
        }
      : {
          intent: "create_button",
          schemaVersion: "1.0",
          actionKind: "weather",
          title: "부산 날씨 확인",
          summary: "부산의 현재 날씨를 조회합니다.",
          fixedInputs: { city: "부산" },
          requiredInputs: [],
          clarifyingQuestion: null,
        };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("날씨 버튼 만들어줘");
  await page.getByRole("button", { name: "버튼 만들기" }).click();
  await expect(page.getByText("어느 도시의 날씨를 확인할까요?", { exact: true })).toBeVisible();
  await page.getByLabel("추가 정보").fill("부산");
  await page.getByRole("button", { name: "이 정보로 계속" }).click();

  await expect(page.getByText("부산 날씨 확인", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});

test("배포 보호로 API가 차단되면 설정 확인 안내를 보여준다", async ({ page }) => {
  await page.route("**/api/buttons/interpret", async (route) => {
    await route.fulfill({ status: 401, contentType: "text/html", body: "login required" });
  });

  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("인천 날씨버튼 만들어줘");
  await page.getByRole("button", { name: "버튼 만들기" }).click();

  await expect(page.getByRole("status")).toContainText("Vercel 배포 보호");
});
