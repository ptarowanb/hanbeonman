import { expect, test } from "@playwright/test";

test("17개 도구를 검색·분류하고 조건을 지워 전체 목록으로 돌아간다", async ({ page }) => {
  await page.goto("/create");
  await expect(page.getByRole("button", { name: /템플릿$/ })).toHaveCount(17);
  await page.getByLabel("생활 도구 검색", { exact: true }).fill("주소");
  await expect(page.getByRole("button", { name: /템플릿$/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "주소·안내문 복사 템플릿" })).toBeVisible();
  await page.getByLabel("생활 도구 검색", { exact: true }).clear();
  await page.getByRole("button", { name: "쇼핑·계산", exact: true }).click();
  await expect(page.getByRole("button", { name: "할인 계산 템플릿" })).toBeVisible();
  await expect(page.getByRole("button", { name: "QR코드 만들기 템플릿" })).toHaveCount(0);
  await page.getByLabel("생활 도구 검색", { exact: true }).fill("없는도구");
  await expect(page.getByText("조건에 맞는 도구가 없어요.")).toBeVisible();
  await page.getByRole("button", { name: "도구 검색 초기화" }).click();
  await expect(page.getByRole("button", { name: /템플릿$/ })).toHaveCount(17);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("할인 버튼은 저장한 할인율과 새 정가로 최종 금액을 계산한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "할인 계산 템플릿" }).click();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "할인 계산 실행", exact: true }).click();
  await page.getByLabel("정가(원)", { exact: true }).fill("50000");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  await expect(page.getByRole("region", { name: "할인 계산 결과" })).toContainText("40,000원");
  await page.reload();
  await page.getByRole("button", { name: "할인 계산 실행", exact: true }).click();
  await expect(page.getByLabel("정가(원)", { exact: true })).toHaveValue("");
});

test("상품 가격을 같은 기준량으로 비교하고 레시피 분량도 조절한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "상품 단가 비교 템플릿" }).click();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "상품 단가 비교 실행", exact: true }).click();
  for (const [label, value] of [["A 가격(원)", "5000"], ["A 수량", "500"], ["B 가격(원)", "8000"], ["B 수량", "1000"]]) await page.getByLabel(label!, { exact: true }).fill(value!);
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  const comparison = page.getByRole("region", { name: "상품 단가 비교 결과" });
  await expect(comparison).toContainText("1,000원");
  await expect(comparison).toContainText("800원");
  await page.getByRole("button", { name: "레시피 분량 조절 템플릿" }).click();
  await page.getByLabel("만들 인분", { exact: true }).fill("3");
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "레시피 분량 조절 실행", exact: true }).click();
  const recipe = page.getByRole("region", { name: "레시피 분량 결과" });
  await expect(recipe).toContainText("300");
  await expect(recipe).toContainText("450");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("QR 버튼은 입력한 링크로 이미지를 만들고 PNG를 내려받는다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "QR코드 만들기 템플릿" }).click();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "QR코드 만들기 실행", exact: true }).click();
  await page.getByLabel("QR에 담을 내용", { exact: true }).fill("https://example.com/hello?city=인천");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  const qr = page.getByRole("img", { name: "생성된 QR코드" });
  await expect(qr).toBeVisible();
  expect(await qr.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "QR코드 PNG 다운로드" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("주소 복사가 차단되면 글을 선택해 직접 복사할 수 있다", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.goto("/create");
  await page.getByRole("button", { name: "주소·안내문 복사 템플릿" }).click();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "주소·안내문 복사 실행", exact: true }).click();
  await page.getByLabel("복사할 글", { exact: true }).fill("서울시 예시로 10\n도착 전 연락해주세요.");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  const text = page.getByLabel("저장한 글", { exact: true });
  await expect(text).toHaveValue("서울시 예시로 10\n도착 전 연락해주세요.");
  await expect(text).toBeFocused();
  expect(await text.evaluate((element) => (element as HTMLTextAreaElement).selectionEnd - (element as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
});

test("길찾기 버튼이 목적지와 이동 수단을 지도에 전달한다", async ({ page }) => {
  await page.route("https://www.google.com/maps/dir/**", route => route.fulfill({ contentType: "text/html", body: "<p>지도 이동 확인</p>" }));
  await page.goto("/create");
  await page.getByRole("button", { name: "길찾기 템플릿" }).click();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "길찾기 실행", exact: true }).click();
  await page.getByLabel("목적지", { exact: true }).fill("서울역");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  await page.waitForURL("https://www.google.com/maps/dir/**");
  const url = new URL(page.url());
  expect(url.searchParams.get("destination")).toBe("서울역");
  expect(url.searchParams.get("travelmode")).toBe("transit");
  expect(url.searchParams.get("api")).toBe("1");
});

test("저장한 안내문은 실행할 때 한 번 복사되고 다시 누르면 새로 복사한다", async ({ page }) => {
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(window, "copiedTexts", { value: copied });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { copied.push(text); } } });
  });
  const draft = { schemaVersion: "1.0", intent: "create_button", actionKind: "text_copy", title: "오시는 길 안내", summary: "방문 안내를 복사합니다.", fixedInputs: { text: "1층 안내데스크에서 연락해주세요." }, requiredInputs: [], clarifyingQuestion: null };
  await page.goto(`/create#button=${encodeURIComponent(JSON.stringify(draft))}`);
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  const run = page.getByRole("button", { name: "오시는 길 안내 실행", exact: true });
  await run.click();
  await expect(page.getByRole("region", { name: "문구 복사 결과" })).toContainText("저장한 글을 복사했습니다.");
  const copied = () => page.evaluate(() => (window as unknown as { copiedTexts: string[] }).copiedTexts);
  expect(await copied()).toEqual([draft.fixedInputs.text]);
  await run.click();
  await expect.poll(copied).toEqual([draft.fixedInputs.text, draft.fixedInputs.text]);
});

test("잘못된 레시피를 입력해도 내용을 유지한 채 고쳐서 실행한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "레시피 분량 조절 템플릿" }).click();
  await page.getByRole("checkbox", { name: "재료 목록 실행할 때마다 입력", exact: true }).check();
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "레시피 분량 조절 실행", exact: true }).click();
  const ingredients = page.getByLabel("재료 목록", { exact: true });
  await ingredients.fill("쌀 200 g\n설탕 적당히");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  await expect(page.locator(".library-result").getByRole("alert")).toContainText("2번째");
  await expect(ingredients).toHaveValue("쌀 200 g\n설탕 적당히");
  await ingredients.fill("쌀 200 g\n설탕 1/2 큰술");
  await page.getByRole("button", { name: "이 정보로 실행" }).click();
  await expect(page.getByRole("region", { name: "레시피 분량 결과" })).toContainText("400 g");
});
