import { expect, test } from "@playwright/test";

test("체크리스트 기본 항목을 수정해 저장하고 실행한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name:"준비물 체크리스트 템플릿" }).click();
  await page.getByLabel("확인할 항목", { exact:true }).fill("여권\n충전기");
  await page.getByRole("button", { name:"이 버튼 저장", exact:true }).click();
  await page.getByRole("button", { name:"준비물 체크리스트 실행", exact:true }).click();
  await page.getByRole("checkbox", { name:"여권", exact:true }).check();
  await expect(page.getByRole("region", { name:"체크리스트 실행", exact:true })).toContainText("2개 중 1개 완료");
});

test("매번 입력하는 버튼은 다시 누르면 새 값을 받는다", async ({ page }) => {
  const draft={schemaVersion:"1.0",intent:"create_button",actionKind:"split_bill",title:"식사 나누기",summary:"식사비를 나눕니다.",fixedInputs:{people:3},requiredInputs:[{key:"amount",label:"금액(원)",type:"text",required:true}],clarifyingQuestion:null};
  await page.goto(`/create#button=${encodeURIComponent(JSON.stringify(draft))}`);
  await page.getByRole("button", { name:"이 버튼 저장", exact:true }).click();
  await page.getByRole("button", { name:"식사 나누기 실행", exact:true }).click();
  await page.getByLabel("금액(원)", { exact:true }).fill("9000");
  await page.getByRole("button", { name:"이 정보로 실행", exact:true }).click();
  await expect(page.getByRole("region", { name:"더치페이 결과" })).toContainText("3,000원");
  await page.getByRole("button", { name:"식사 나누기 실행", exact:true }).click();
  await expect(page.getByLabel("금액(원)", { exact:true })).toHaveValue("");
});

test("11종 생활 작업에서 선택하고 편집·검색·복제·삭제 복구한다", async ({ page }) => {
  await page.goto("/create");
  await expect(page.getByRole("button", { name: /템플릿$/ })).toHaveCount(11);
  await page.getByRole("button", { name: "횟수 기록 템플릿" }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("물 마시기");
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByRole("button", { name: "물 마시기 실행", exact: true }).click();
  await page.getByRole("button", { name: "횟수 추가", exact: true }).click();
  await expect(page.getByLabel("현재 횟수")).toHaveText("1");
  await page.getByRole("button", { name: "물 마시기 즐겨찾기", exact: true }).click();
  await page.getByRole("button", { name: "물 마시기 복제", exact: true }).click();
  await page.getByLabel("내 버튼 검색").fill("복사본");
  await expect(page.getByRole("button", { name: "물 마시기 복사본 실행", exact: true })).toBeVisible();
  await page.getByLabel("내 버튼 검색").clear();
  await page.getByRole("button", { name: "물 마시기 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제 취소", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "물 마시기 실행", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("지역 없는 날씨 요청에 답하면 초안이 만들어진다", async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("날씨");
  await page.getByRole("button", { name: "버튼 만들기", exact: true }).click();
  await expect(page.getByLabel("추가 정보", { exact: true })).toBeVisible();
  await page.getByLabel("추가 정보", { exact: true }).fill("인천");
  await page.getByRole("button", { name: "이 정보로 계속" }).click();
  await expect(page.getByRole("heading", { name: /인천 날씨/ })).toBeVisible();
});

test("설정 링크를 검토 후 저장하고 잘못된 백업은 기존 자료를 보존한다", async ({ page }) => {
  const draft = { schemaVersion: "1.0", intent: "create_button", actionKind: "timer", title: "공유받은 타이머", summary: "25분간 집중합니다.", fixedInputs: { minutes: 25 }, requiredInputs: [], clarifyingQuestion: null };
  await page.goto(`/create#button=${encodeURIComponent(JSON.stringify(draft))}`);
  await expect(page.getByRole("heading", { name: "공유받은 타이머" })).toBeVisible();
  await expect(page.getByRole("button", { name: "공유받은 타이머 실행" })).toHaveCount(0);
  await page.getByRole("button", { name: "이 버튼 저장", exact: true }).click();
  await page.getByLabel("백업 파일 불러오기").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from('{"wrong":true}') });
  await expect(page.getByRole("status")).toContainText("올바른 한번만 백업");
  await expect(page.getByRole("button", { name: "공유받은 타이머 실행" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "백업 내려받기", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toContain("hanbeonman-buttons");
});

test("더치페이는 금액과 인원을 차례로 받고 버튼을 완성한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("만들고 싶은 작업").fill("더치페이");
  await page.getByRole("button", { name:"버튼 만들기", exact:true }).click();
  await page.getByLabel("추가 정보", { exact:true }).fill("10,000원");
  await page.getByRole("button", { name:"이 정보로 계속" }).click();
  await expect(page.getByLabel("추가 정보", { exact:true })).toHaveValue("");
  await page.getByLabel("추가 정보", { exact:true }).fill("3명");
  await page.getByRole("button", { name:"이 정보로 계속" }).click();
  await page.getByRole("button", { name:"이 버튼 저장", exact:true }).click();
  await page.getByRole("button", { name:"더치페이 실행", exact:true }).click();
  await expect(page.getByRole("region", { name:"더치페이 결과" })).toContainText("3,334원");
});

test("백업 파일을 새 브라우저 보관함에 복원한다", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name:"횟수 기록 템플릿" }).click();
  await page.getByLabel("버튼 이름", { exact:true }).fill("백업할 기록");
  await page.getByRole("button", { name:"이 버튼 저장", exact:true }).click();
  const pendingDownload=page.waitForEvent("download");
  await page.getByRole("button", { name:"백업 내려받기", exact:true }).click();
  const backupPath=await (await pendingDownload).path();
  await page.evaluate(()=>localStorage.removeItem("hanbeonman.generated-buttons"));
  await page.reload();
  await expect(page.getByRole("button", { name:"백업할 기록 실행" })).toHaveCount(0);
  await page.getByLabel("백업 파일 불러오기").setInputFiles(backupPath!);
  await expect(page.getByRole("button", { name:"백업할 기록 실행" })).toBeVisible();
});
