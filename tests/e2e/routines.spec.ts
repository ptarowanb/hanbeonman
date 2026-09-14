import { expect, test } from "@playwright/test";

test("체크리스트 진행률을 저장하고 다시 시작한다", async ({ page }) => {
  await page.goto("/routines");
  await page.getByLabel("체크할 항목").fill("여권\n충전기");
  await page.getByRole("button", { name: "도구 열기" }).click();
  await page.getByRole("checkbox", { name: "여권" }).check();
  await expect(page.getByRole("status")).toHaveText("2개 중 1개 완료");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "여권" })).toBeChecked();
  await page.getByRole("checkbox", { name: "충전기" }).check();
  await expect(page.getByRole("status")).toHaveText("모두 준비됐어요!");
  await page.getByRole("button", { name: "체크 다시 시작" }).click();
  await expect(page.getByRole("status")).toHaveText("2개 중 0개 완료");
});

test("타이머를 시작하고 일시정지한 뒤 새로고침해 이어서 완료한다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-14T04:00:00Z") });
  await page.goto("/routines");
  await page.getByRole("button", { name: "타이머", exact: true }).click();
  await page.getByLabel("시간(분)").fill("1");
  await page.getByRole("button", { name: "도구 열기" }).click();
  await page.getByRole("button", { name: "타이머 시작" }).click();
  await page.clock.fastForward(15_000);
  await page.getByRole("button", { name: "일시정지" }).click();
  const paused = await page.getByRole("timer").textContent();
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("timer")).toHaveText(paused!);
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText(paused!);
  await page.getByRole("button", { name: "이어서 시작" }).click();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("타이머가 진행 중이에요.");
  await page.clock.fastForward(60_000);
  await expect(page.getByRole("status")).toHaveText("설정한 시간이 끝났어요!");
  await expect(page.getByRole("timer")).toHaveText("00:00");
  await page.getByRole("button", { name: "타이머 초기화" }).click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
});
