# TAGO 고속버스 조회 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공공데이터포털 TAGO 고속버스 API를 서버 전용 키로 호출하고, 웹에서 출발지·도착지·날짜를 입력해 실제 조회 결과를 확인한다.

**Architecture:** `packages/connectors`는 TAGO 요청 URL 구성과 응답 정규화만 담당한다. Next.js Route Handler가 서버 환경변수를 읽고 입력을 검증한 뒤 커넥터를 호출하며, 버스 화면은 이 API만 사용한다. 키가 없거나 공급자 응답 계약이 바뀌면 가짜 결과를 만들지 않고 명확한 오류를 보여준다.

**Tech Stack:** TypeScript, Zod, Vitest, Next.js App Router, Node.js runtime, TAGO REST JSON API

**Spec:** `SDD.md` §3.1, §6.1, §6.3, §8, §10, §12 T-03

## Global Constraints

- `TAGO_SERVICE_KEY`는 서버 전용 환경변수이며 실제 값은 Git·채팅·로그에 넣지 않는다.
- TAGO 호출은 HTTPS와 JSON 응답을 사용하고, 예약·결제·잔여석을 제공한다고 표시하지 않는다.
- 지원 인자는 출발 터미널 ID, 도착 터미널 ID, 출발일(`YYYYMMDD`), 선택적 버스 등급·페이지 크기뿐이다.
- 외부 응답이 비어 있으면 `EMPTY`, 인증·계약 오류는 `NEEDS_ATTENTION`, 네트워크 오류는 `FAILED` 성격으로 전달한다.
- 모든 작업은 테스트 먼저 작성하고 실패를 확인한 뒤 구현하며, 기능 단위로 한국어 커밋·푸시한다.

### Task 1: TAGO 커넥터 계약

**Files:**
- Create: `packages/connectors/package.json`
- Create: `packages/connectors/tsconfig.json`
- Create: `packages/connectors/src/tago.ts`
- Test: `packages/connectors/src/tago.test.ts`

**Interfaces:**
- Produces `createTagoClient({ serviceKey, fetchImpl?, baseUrl? })` and `TagoClient.getSchedules(query)`.
- Returns normalized schedule rows with route, grade, departure/arrival time, places, and fare.

- [ ] Write failing tests for URL encoding, JSON response normalization, empty results, and provider errors.
- [ ] Run `pnpm vitest run packages/connectors/src/tago.test.ts` and confirm the missing module/API failure.
- [ ] Implement the minimal connector and Zod response checks.
- [ ] Run the focused test and the full test suite.
- [ ] Commit and push `feat: TAGO 고속버스 커넥터 계약 구현`.

### Task 2: 서버 조회 API

**Files:**
- Create: `apps/web/app/api/tago/schedules/route.ts`
- Test: `apps/web/app/api/tago/schedules/route.test.ts`

**Interfaces:**
- Provides `GET /api/tago/schedules?depTerminalId=...&arrTerminalId=...&depPlandTime=...`.
- Reads only `TAGO_SERVICE_KEY` on the server and returns a stable `{ status, data?, error? }` envelope.

- [ ] Write failing route tests for required parameters, missing key, success, empty response, and upstream failure.
- [ ] Run the focused route test and confirm failure before implementation.
- [ ] Implement Node.js Route Handler with strict input validation, 30-second timeout, and safe error mapping.
- [ ] Run route tests, typecheck, and build.
- [ ] Commit and push `feat: TAGO 서버 조회 API 연결`.

### Task 3: 한국어 버스 조회 화면

**Files:**
- Create: `apps/web/app/bus/page.tsx`
- Create: `apps/web/app/bus/BusSearchForm.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/bus.spec.ts`

**Interfaces:**
- Provides a mobile-first form for terminal IDs and date, plus result/empty/error states and source timestamp.
- Never displays a reservation, seat, or payment action.

- [ ] Write an E2E test that verifies the form and missing-key state without contacting TAGO.
- [ ] Run the focused E2E test and confirm the page is absent.
- [ ] Implement the page and link it from the existing example card.
- [ ] Run focused E2E, full E2E, typecheck, and build.
- [ ] Commit and push `feat: 고속버스 조회 화면 추가`.

### Task 4: 연동 상태 문서화

**Files:**
- Modify: `SDD.md`
- Modify: `README.md`

- [ ] Record the verified TAGO endpoint, operations, response fields, and current environment status without any secret value.
- [ ] Record that live 10-case acceptance is pending until a rotated key is entered and verified.
- [ ] Run secret scan and documentation link checks.
- [ ] Commit and push `docs: TAGO 연동 상태와 설정 방법 정리`.
