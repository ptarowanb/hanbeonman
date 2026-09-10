# 반복 조회 버튼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 고속버스·사진·날씨 같은 실생활 작업을 등록된 버튼으로 실행하고, 고속버스 조건은 한 번 저장해 다음부터 버튼 한 번으로 오늘 시간표를 조회할 수 있는 실제 반복 사용 흐름을 제공한다.

**Architecture:** 실생활 작업은 허용 목록 기반 `ActionDefinition`으로 등록해 임의 URL·스크립트 실행을 막는다. 고속버스 조회 조건은 `BusQuickButton` 계약으로 정규화하고 브라우저 `localStorage`에만 저장한다. 저장한 버튼을 누르면 날짜를 실행 시점의 현지 날짜로 계산해 기존 TAGO Route Handler를 호출하며, 날씨는 키 없는 Open-Meteo 조회 어댑터로 제공하고 사진은 기존 브라우저 전용 도구로 연결한다. 홈·사진 화면은 구현 상태를 드러내는 개발 문구 대신 지금 사용할 수 있는 작업 도구와 경계를 설명한다.

**Tech Stack:** TypeScript, Next.js App Router, React 19, Zod, browser localStorage, Open-Meteo API, Vitest, Playwright.

**Spec:** `SDD.md`의 4.2 수신 흐름, 7.3 공개 조회 계약, 12 기능 단위 task 원칙.

## Global Constraints

- 터미널·등급 목록은 TAGO 서버에서 미리 조회한 검증 목록만 사용한다.
- 저장 버튼에는 터미널 ID·등급 ID·표시 이름만 저장하고 날짜는 저장하지 않는다.
- TAGO 서비스 키와 다른 Secret은 클라이언트 번들·localStorage·로그에 넣지 않는다.
- 외부 작업은 `ActionDefinition`에 등록된 어댑터만 실행하고 임의 URL·스크립트·로그인 자동화를 받지 않는다.
- 예약·결제·잔여석을 제공한다고 표시하지 않는다.
- 기존 조회 API의 `EMPTY`, `NEEDS_ATTENTION`, `FAILED`, `INVALID_INPUT` 상태를 그대로 사용자에게 설명한다.
- 기능 단위로 테스트·검증한 뒤 한국어 커밋 메시지로 커밋·푸시한다.

---

### Task 0: 실생활 작업 등록 계약과 날씨 어댑터

**Files:**
- Create: `packages/contracts/src/actions.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/actions.test.ts`
- Create: `packages/connectors/src/weather.ts`
- Modify: `packages/connectors/src/index.ts`
- Create: `packages/connectors/src/weather.test.ts`
- Create: `apps/web/app/api/weather/route.ts`
- Create: `apps/web/app/api/weather/route.test.ts`

**Interfaces:**
- Produces `ActionKind`, `ActionDefinition`, `actionRegistry`, `buildWeatherGeocodingUrl`, `buildWeatherForecastUrl`, `parseWeatherLocationResponse`, `parseWeatherForecastResponse`, and `getWeather`.

- [ ] **Step 1: Write failing contract and connector tests**

Test that the registry contains `bus_schedule`, `photo_compress`, and `weather` with explicit execution targets; test Open-Meteo URL construction, a normalized current-weather response, no-result city handling, and `/api/weather` invalid input/success/error states.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/contracts/src/actions.test.ts packages/connectors/src/weather.test.ts apps/web/app/api/weather/route.test.ts`

Expected: FAIL because the action registry, weather connector, and route do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement the allowlisted registry and Open-Meteo client with Zod parsing. Keep a single request timeout, return `EMPTY` when geocoding finds no city, and map upstream/network failures to safe Korean messages without returning request URLs beyond the public provider name.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/contracts/src/actions.test.ts packages/connectors/src/weather.test.ts apps/web/app/api/weather/route.test.ts`

Expected: all new contract, connector, and route tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src packages/connectors/src apps/web/app/api/weather
git commit -m "feat: 실생활 작업 등록과 날씨 조회 추가"
git push origin main
```

### Task 1: 반복 조회 버튼 계약과 저장 변환

**Files:**
- Create: `apps/web/app/bus/quickButton.ts`
- Test: `apps/web/app/bus/quickButton.test.ts`

**Interfaces:**
- Produces `BusQuickButton`, `createQuickButton`, `parseQuickButtons`, `serializeQuickButtons`, `getLocalDateInputValue`.

- [ ] **Step 1: Write the failing test**

```ts
it("저장 버튼을 안전하게 정규화하고 날짜는 현지 기준으로 만든다", () => {
  const button = createQuickButton({
    name: "  금요일 대전 출장  ",
    departure: { id: "NAEK010", name: "서울경부" },
    arrival: { id: "NAEK300", name: "대전복합" },
    grade: { id: "2", name: "우등" },
  }, new Date("2026-09-10T23:30:00+09:00"));

  expect(button.name).toBe("금요일 대전 출장");
  expect(button.id).toMatch(/^bus-/);
  expect(getLocalDateInputValue(new Date("2026-09-10T23:30:00+09:00"))).toBe("2026-09-10");
  expect(parseQuickButtons(serializeQuickButtons([button]))).toEqual([button]);
});

it("깨진 localStorage 값은 빈 목록으로 처리한다", () => {
  expect(parseQuickButtons("{broken")).toEqual([]);
  expect(parseQuickButtons(JSON.stringify([{ name: "이름만 있음" }]))).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/app/bus/quickButton.test.ts`

Expected: FAIL because `./quickButton` and its exported functions do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type BusQuickButton = {
  id: string;
  name: string;
  departure: { id: string; name: string };
  arrival: { id: string; name: string };
  grade: { id: string; name: string } | null;
  createdAt: string;
};

export function createQuickButton(input: Omit<BusQuickButton, "id" | "createdAt">, now = new Date()): BusQuickButton {
  return { ...input, name: input.name.trim(), id: `bus-${now.getTime()}`, createdAt: now.toISOString() };
}

export function serializeQuickButtons(buttons: BusQuickButton[]): string { return JSON.stringify(buttons); }

export function parseQuickButtons(value: string | null): BusQuickButton[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBusQuickButton);
  } catch { return []; }
}

export function getLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/app/bus/quickButton.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/bus/quickButton.ts apps/web/app/bus/quickButton.test.ts
git commit -m "feat: 반복 조회 버튼 계약 추가"
git push origin main
```

### Task 2: 버스 조건 저장과 버튼 한 번 조회

**Files:**
- Modify: `apps/web/app/bus/BusSearchForm.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/bus.spec.ts`

**Interfaces:**
- Consumes `BusQuickButton` and helpers from Task 1.
- Produces localStorage key `hanbeonman.bus.quick-buttons`, a visible `저장된 조회 버튼` list, and button names submitted through the existing schedule request.

- [ ] **Step 1: Write the failing test**

Add an E2E scenario that mocks lookup and schedule APIs, selects Seoul → Daejeon, saves `금요일 대전 출장`, reloads, clicks the saved button, and asserts the schedule request receives the saved terminal IDs plus an 8-digit execution date. Assert that the result card is visible without manually pressing the form’s `시간표 조회` button.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/bus.spec.ts --project=desktop-chromium --workers=1 --reporter=line`

Expected: FAIL because `저장된 조회 버튼`, `조건을 버튼으로 저장`, and the saved button are not rendered.

- [ ] **Step 3: Write minimal implementation**

Refactor the existing submit handler into `runSearch({ departure, arrival, date, grade })`. Load and persist the button list in `useEffect`. Add a save panel that resolves selected terminal/grade names from the loaded lists. Add `handleQuickButtonClick` that sets the current fields, computes `getLocalDateInputValue()`, and awaits `runSearch` with the saved IDs. Render each saved item as a button with its route, grade, and `오늘 바로 조회` action; show an empty explanation when no button exists.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/bus.spec.ts --project=desktop-chromium --workers=1 --reporter=line`

Expected: all bus scenarios pass, including the saved-button one-click lookup.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/bus/BusSearchForm.tsx apps/web/app/globals.css tests/e2e/bus.spec.ts
git commit -m "feat: 저장한 조회 버튼으로 시간표 실행"
git push origin main
```

### Task 3: 사용자 화면에서 개발중 문구 제거

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/photo/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Produces user-facing copy that describes available tools and links directly to `/bus` and `/photo`.

- [ ] **Step 1: Write the failing test**

Extend the home E2E check to assert the visible page does not contain `지금은 개발 중`, `아직 작동하지 않아요`, or `개발 중인 첫 번째 도구`, and that `고속버스 버튼 만들기` and `사진 도구 열기` links are visible.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/home.spec.ts --project=desktop-chromium --workers=1 --reporter=line`

Expected: FAIL because the current home and photo copy still use development-state labels.

- [ ] **Step 3: Write minimal implementation**

Replace the home status and placeholder art text with `개인용 작업 도구` and `사용 예시 · 버튼으로 바로 실행`. Replace the “준비 중” section with a `지금 바로 사용해 보세요` CTA section. Change the photo eyebrow to `기기 안에서 쓰는 사진 도구`, keeping the browser-only privacy boundary.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/home.spec.ts --project=desktop-chromium --workers=1 --reporter=line`

Expected: all home scenarios pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/photo/page.tsx apps/web/app/globals.css tests/e2e/home.spec.ts
git commit -m "feat: 사용자용 도구 안내 화면 정리"
git push origin main
```

### Task 4: 문서와 전체 검증

**Files:**
- Modify: `README.md`
- Modify: `SDD.md`

- [ ] **Step 1: Update documentation**

Document the local quick-button behavior, date handling, browser storage boundary, and that authentication/cloud synchronization remain outside this iteration.

- [ ] **Step 2: Run full verification**

Run sequentially: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`, `pnpm secrets:check`, `pnpm supabase:test`, `git diff --check`.

Expected: all commands pass; E2E remains green across desktop, mobile, and narrow mobile.

- [ ] **Step 3: Commit**

```bash
git add README.md SDD.md
git commit -m "docs: 반복 조회 버튼 사용 범위 기록"
git push origin main
```
