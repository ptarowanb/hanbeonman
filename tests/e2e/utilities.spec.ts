import { expect, test, type Page } from "@playwright/test";

async function openUtility(page: Page, actionKind: string, title: string, fixedInputs: Record<string, string | number>) {
  const intent = { schemaVersion: "1.0", intent: "create_button", actionKind, title, summary: "생활 도구를 실행합니다.", fixedInputs, requiredInputs: [], clarifyingQuestion: null };
  await page.goto(`/create#button=${encodeURIComponent(JSON.stringify(intent))}`);
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: `${title} 실행`, exact: true }).click();
}

test("횟수 기록은 새로고침 후 이어지고 0 아래로 내려가지 않는다", async ({ page }) => {
  await openUtility(page, "counter", "마신 물", { step: 1 });
  await page.getByRole("button", { name: "횟수 추가", exact: true }).click();
  await expect(page.getByLabel("현재 횟수", { exact: true })).toHaveText("1");
  await page.reload();
  await page.getByRole("button", { name: "마신 물 실행", exact: true }).click();
  await expect(page.getByLabel("현재 횟수", { exact: true })).toHaveText("1");
  await page.getByRole("button", { name: "횟수 빼기", exact: true }).click();
  await expect(page.getByLabel("현재 횟수", { exact: true })).toHaveText("0");
  await expect(page.getByRole("button", { name: "횟수 빼기", exact: true })).toBeDisabled();
});

test("총액을 나눌 때 남은 원도 분배해 보여준다", async ({ page }) => {
  await openUtility(page, "split_bill", "식사 정산", { amount: 10000, people: 3 });
  const result = page.getByRole("region", { name: "더치페이 결과", exact: true });
  await expect(result).toContainText("3,333원");
  await expect(result).toContainText("3,334원");
  await expect(result).toContainText("10,000원");
  await expect(result).toContainText("2명");
});

test("횟수 저장이 차단되면 화면에만 반영됐음을 알린다", async ({ page }) => {
  await openUtility(page, "counter", "임시 기록", { step: 1 });
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("blocked", "QuotaExceededError"); }; });
  await page.getByRole("button", { name: "횟수 추가", exact: true }).click();
  await expect(page.getByLabel("현재 횟수", { exact: true })).toHaveText("1");
  await expect(page.getByText("횟수를 저장하지 못해 이 화면에만 반영했습니다. 새로고침하면 사라질 수 있어요.", { exact: true })).toBeVisible();
});

test("단위 변환은 온도를 계산해 읽기 쉽게 표시한다", async ({ page }) => {
  await openUtility(page, "unit_convert", "섭씨 변환", { value: 32, from: "fahrenheit", to: "celsius" });
  await expect(page.getByLabel("변환 결과", { exact: true })).toHaveText("0°C");
});

test("글을 붙여넣어 중복을 정리하고 복사가 차단되면 직접 복사할 수 있다", async ({ page }) => {
  await openUtility(page, "text_cleanup", "글 정리", { mode: "deduplicate" });
  await page.getByLabel("정리할 글", { exact: true }).fill(" 사과  \n\n 사과\n 배 ");
  await page.getByRole("button", { name: "글 정리하기", exact: true }).click();
  await expect(page.getByLabel("정리된 글", { exact: true })).toHaveValue("사과\n배");
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("blocked"); } } }); });
  await page.getByRole("button", { name: "정리된 글 복사", exact: true }).click();
  await expect(page.getByText("자동 복사가 차단되어 결과를 선택했습니다. 직접 복사해주세요.", { exact: true })).toBeVisible();
  const selection = await page.getByLabel("정리된 글", { exact: true }).evaluate((element: HTMLTextAreaElement) => element.value.slice(element.selectionStart, element.selectionEnd));
  expect(selection).toBe("사과\n배");
});

test("무작위 선택은 눌러야 실행되고 입력된 선택지에서만 고른다", async ({ page }) => {
  await openUtility(page, "random_pick", "메뉴 선택", { options: "김밥\n국수\n덮밥" });
  await expect(page.getByLabel("선택 결과", { exact: true })).toHaveText("아직 고르지 않았어요");
  await page.getByRole("button", { name: "하나 골라줘", exact: true }).click();
  await expect(page.getByLabel("선택 결과", { exact: true })).toHaveText(/^(김밥|국수|덮밥)$/);
});

test("디데이는 한국 날짜를 기준으로 계산한다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-14T15:30:00Z") });
  await openUtility(page, "dday", "생일 확인", { date: "2026-09-15", event: "생일" });
  await expect(page.getByLabel("남은 날짜", { exact: true })).toHaveText("D-DAY");
});
