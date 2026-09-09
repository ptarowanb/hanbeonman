import { expect, test } from "@playwright/test";

test("시작 화면이 뷰포트에 맞고 안내 링크가 실제 흐름으로 이동한다", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  if (testInfo.project.name.includes("mobile")) {
    const principleFontSize = await page.locator(".promise-grid p").first().evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(principleFontSize).toBeGreaterThanOrEqual(18);
  }

  await page.getByRole("link", { name: "어떻게 사용하는지 보기" }).click();
  await expect(page.locator("#how-it-works")).toBeInViewport();
  await expect(page).toHaveURL(/#how-it-works$/);
});
