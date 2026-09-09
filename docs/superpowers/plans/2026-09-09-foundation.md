# 한번만 공통 명세와 개발 환경 구현 계획

> 에이전트 실행: `superpowers:subagent-driven-development`로 작업별 구현과 검토를 수행한다. 제품 명세는 루트의 단일 SDD를 따른다.

**목표:** 외부 계정이나 비밀 키 없이 실행·검증 가능한 웹 개발 환경과 작업 명세 검증기를 제공한다.

**구조:** pnpm workspace의 `apps/web`은 Next.js 앱, `packages/contracts`는 브라우저·서버 공통 계약이다. 이 단계는 실제 AI 생성·공유·조회·사진 변환 완료를 주장하지 않는다. 외부 서비스 연결은 SDD 12절의 후속 작업이다.

**스택:** TypeScript, Next.js, React, Tailwind CSS, Zod, Vitest, Playwright. Node.js 24, pnpm 11.

**제품 명세:** [SDD.md](../../../SDD.md)

## 공통 제약

- 코드 식별자 이외의 사용자 문구·문서·커밋 설명은 한국어로 작성한다.
- 사진 데이터, 원본 파일명, EXIF, 비밀번호, 인증 쿠키를 기록하거나 업로드하지 않는다.
- 공개 조회와 사진 처리 명세의 실행 대상은 각각 `server`, `recipient_browser`다.
- 종료된 Run 상태를 지연 응답으로 덮어쓰지 않는다.
- 미등록 어댑터·동작·입력 참조는 검증 실패다. 임의 코드·URL을 실행하지 않는다.
- 초기 화면은 구현된 기능만 제공하고, 준비 중인 기능의 성공 결과를 연출하지 않는다.
- 제품 수용 기준 AC-01~17은 각 실제 기능 구현·검증 시점에 따로 판정한다.

## Task 1: 공통 명세와 상태 검증

**파일:** `packages/contracts/src/{workflow,events,run,index}.ts`, 각 `.test.ts`. 기존 package.json·tsconfig는 루트가 준비한다.

**입력:** SDD 7.3 사진 명세 예시와 명세를 검증할 등록 어댑터 목록.

**출력 인터페이스:**

```ts
export type TaskKind = "public_query" | "local_image_batch";
export type RunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "EMPTY"
  | "NEEDS_ATTENTION" | "FAILED" | "CANCELED";
export function canTransitionRun(from: RunStatus, to: RunStatus): boolean;
export function validateWorkflow(value: unknown, registry: readonly AdapterContract[]):
  { success: true; data: Workflow } | { success: false; issues: string[] };
```

`Workflow`와 `AdapterContract`는 위 파일에서 Zod 스키마와 타입으로 함께 export한다. 어댑터 계약은 ID·버전·유형·실행 대상·단계별 필수 참조·완료/출력·상수/입력 정책을 포함한다. 기본 레지스트리는 사진 처리만 등록하며, 공개 조회는 실제 연동 단계에서 등록한다. 미등록 공개 조회를 실제 지원으로 처리하지 않는다. 사진 긴 변 1,600px·품질 0.82는 기본값이며, 각각 정수 1~4,096px·0.1~1.0 범위의 다른 값도 허용한다. JPEG와 메타데이터 제거 및 로컬 처리는 고정 불변식이다.

- [ ] SDD 사진 예시를 테스트 fixture로 사용한다. 메타데이터 제거 비활성화, 파일 업로드 단계, 존재하지 않는 inputRef, 중복 입력 키, 잘못된 어댑터 버전, 실행 대상 변경을 각각 거부하는 테스트를 먼저 작성하고 실패를 확인한다.
- [ ] `events.ts`에 시작·종료 사이의 정제 이벤트 계약을 작성한다. 순번·상대 시각·등록 소스/필드·허용 값만 받아들이며 사진 입력은 `recipient_file_input` 자리표시자다. 미등록 필드, 파일명/EXIF/인증정보 같은 추가 필드는 거부한다. 이 단계는 실제 기록 확장을 구현하지 않는다.
- [ ] `workflow.ts`에 strict 스키마와 레지스트리 검증을 구현한다. SDD의 사진 규칙을 유지하고, 참조와 동작 순서를 검증한다. 공개 조회는 주입된 어댑터 정책을 통해 검증하되 내장 실제 연동을 가장하지 않는다.
- [ ] `run.ts`에 허용 전이를 구현한다. QUEUED→RUNNING/CANCELED, RUNNING→종료 상태만 허용한다. 다음 테스트가 취소 후 성공 덮어쓰기를 잡아야 한다.

```ts
expect(canTransitionRun("QUEUED", "RUNNING")).toBe(true);
expect(canTransitionRun("RUNNING", "CANCELED")).toBe(true);
expect(canTransitionRun("CANCELED", "SUCCEEDED")).toBe(false);
expect(canTransitionRun("SUCCEEDED", "RUNNING")).toBe(false);
```

- [ ] `pnpm test`와 `pnpm --filter @hanbeonman/contracts typecheck`를 실행한다. 거부·수락 사례가 모두 통과해야 한다.
- [x] 구현 범위와 테스트 결과를 검토받았다. 공통 명세 검증은 `feat: 작업 명세와 실행 상태 검증 구현`으로 독립 커밋하고 즉시 푸시한다.

## Task 2: 한국어 웹 시작 화면과 검증 자동화

**파일:** `apps/web/app/{layout,page,globals.css}`, `apps/web/{next.config.ts,tsconfig.json,postcss.config.mjs}`, `playwright.config.ts`, `tests/e2e/home.spec.ts`, `.github/workflows/ci.yml`. `next-env.d.ts`는 Next.js가 생성하며 Git에서 제외한다.

**입력:** README의 소개 문구·SDD의 두 작업 유형. 외부 환경변수 없이 초기 페이지가 열려야 한다.

**출력:** `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test:e2e` 명령으로 확인 가능한 앱. 웹 단계는 공통 명세 함수 호출에 의존하지 않아 Task 1과 파일 수정이 겹치지 않는다.

- [ ] Next.js App Router의 한국어 시작 화면을 구성한다. 핵심 문구는 “한 번의 도움, 다음부터 스스로.”, 시연 가능한 두 작업 유형과 제작→검토→전달 흐름을 설명한다. 현재 상태를 “개발 중”으로 명시하고 작동하지 않는 생성/로그인 버튼을 배치하지 않는다. 화면 내 이동 링크는 실제 대상이 있어야 한다.
- [ ] 모바일 기본 글자 18px, 주요 조작 영역 최소 48px, 명확한 포커스, 한국어 문서 언어를 적용한다. 외부 폰트/이미지/추적 스크립트 요청 없이 실행한다.
- [ ] Playwright에서 아래 실제 페이지 검증을 작성한다. 일반적인 정적 문구를 한 줄씩 검사하는 테스트는 추가하지 않는다.

```ts
await page.goto("/");
await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
await page.getByRole("link", { name: "어떻게 사용하는지 보기" }).click();
await expect(page.locator("#how-it-works")).toBeInViewport();
```

- [ ] CI는 체크아웃, Node 24·pnpm 설치, frozen lockfile 설치, 타입 검사, 단위 테스트, 프로덕션 빌드, Chromium 설치 및 E2E를 순서대로 실행한다. 권한은 contents: read로 둔다. 클라우드 배포와 secret은 이 CI에 필요 없다.
- [ ] 실제 production build와 데스크톱·모바일 Chromium에서 확인한 뒤 `feat: 한국어 웹 시작 화면과 모바일 검증 구현`으로 독립 커밋하고 즉시 푸시한다.

## 검토와 인계

- [ ] README에 실제 설치 명령과 계정 준비 순서를 반영한다.
- [ ] SDD의 기술 결정과 후속 기능 task 상태를 갱신한다.
- [ ] 문서 링크·비밀 값 비포함·git diff --check를 확인한다.
- [ ] 두 task를 독립 검토한 뒤 전체 변경을 검토한다. 기존 사용자 승인에 따라 각 기능 완료 시 main에 합치고 한글 커밋으로 각각 푸시한다. 여러 기능을 모아 한 번에 푸시하지 않는다.

후속 비밀 키 관리·유출 방지 설정도 별도 기능 커밋으로 검증·푸시한다. 실제 키는 커밋에 포함하지 않는다.

이 계획의 완료는 개발 기반 완료다. 실제 인증·AI 생성·공유·어댑터 실행과 AC-01~17 완료로 표시하지 않는다.
