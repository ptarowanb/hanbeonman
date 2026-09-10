import { expect, test } from "@playwright/test";

test("시작 화면이 뷰포트에 맞고 안내 링크가 실제 흐름으로 이동한다", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("지금은 개발 중")).toHaveCount(0);
  await expect(page.getByText("아직 작동하지 않아요")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "고속버스 버튼 만들기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "사진 도구 열기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "오늘 날씨 보기" })).toBeVisible();
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

test("사진 도구가 선택한 이미지를 브라우저에서 ZIP으로 만든다", async ({ page }) => {
  await page.goto("/photo");
  await page.locator("#photo-files").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  const convertButton = page.getByRole("button", { name: "사진 변환하고 ZIP 만들기" });
  await expect(convertButton).toBeEnabled();
  await convertButton.click();
  await expect(page.getByRole("status")).toContainText("1개 사진을 기기 안에서 변환했습니다.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "변환한 ZIP 다운로드" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hanbeonman-photos.zip");
});
