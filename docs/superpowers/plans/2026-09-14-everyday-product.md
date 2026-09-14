# 실사용 생활 버튼 Implementation Plan

> **For agentic workers:** Use task-by-task development with regression tests and independent review. 사용자 요청에 따라 승인 대기 없이 기능별 한국어 커밋·푸시한다.

**Goal:** 버튼 생성부터 편집·저장·실행·전달까지 완성하고 생활 작업을 확장한다.

**Architecture:** 작업별 계약과 등록 도구를 유지하며 로컬 보관함, 입력 검증, 실행 컴포넌트를 분리한다. 독립적인 날씨·도구 연결·신규 작업을 병렬 개발하고 보관함에서 통합한다.

**Tech Stack:** TypeScript, Next.js 16.3.4, React 19, Zod, Vitest, Playwright.

**Spec:** docs/plans/2026-09-14-everyday-product-design.md

## Global Constraints

- 한국어 사용자 문구와 커밋 메시지. 비밀 키는 Git·로그에 기록하지 않는다.
- 기존 localStorage 배열을 유지하고 메타데이터는 선택 필드로 읽는다.
- 동시에 다른 작업의 파일을 편집하지 않는다. 커밋·푸시는 주 에이전트가 통합 검증 후 수행한다.
- 최대 버튼 50개, 백업 200KB, 공유 fragment 16KB. 실패 시 기존 자료를 보존한다.

## Task 1: 날씨 결과

Files: packages/connectors/src/weather.ts 및 테스트, apps/web/app/weather/WeatherTool.tsx, 전용 WeatherResultCard.tsx와 CSS, API 테스트.

Interface: WeatherResult OK의 current에 기존 필드 유지, 선택적 feelsLikeC/humidityPercent/windSpeedKmh, 선택적 today(date/minC/maxC/precipitationProbability) 추가. WeatherResultCard는 API OK 응답을 prop으로 받는다.

- [ ] 응답의 선택 필드 누락 호환성과 실제 일일 자료를 검사하는 실패 테스트 추가.
- [ ] 예보 파싱, 결과 카드 및 한국어 외출 안내 구현.
- [ ] focused Vitest 및 E2E 실행 후 `feat: 날씨 예보와 외출 준비 정보 확장` 커밋·푸시.

## Task 2: 버스·사진 실행 연결

Files: apps/web/app/bus 및 photo 디렉터리의 입력 처리와 테스트, tests/e2e의 별도 preset-execution.spec.ts.

Interface: /bus?departure=…&arrival=…&grade=…&weekday=0..6&date=YYYY-MM-DD&auto=1, /photo?maxEdge=…&quality=… . 제공된 이름·ID를 정확히 해석하고 모호하면 사용자 선택.

- [ ] 이름·ID·모호성·요일·명시 날짜 우선순위와 사진 옵션 범위 실패 테스트 추가.
- [ ] 클라이언트 초기 입력 복원 및 준비된 버스 조건의 단일 자동 조회 구현.
- [ ] focused 검증 후 `feat: 저장한 버스와 사진 조건으로 바로 실행` 커밋·푸시.

## Task 3: 체크리스트·타이머

Files: packages/contracts/src/buttonIntent.ts와 테스트, packages/connectors/src/gemini.ts와 테스트, apps/web/app/routines/*, tests/e2e/routines.spec.ts.

Interface: actionKind checklist의 fixedInputs.items는 줄바꿈 구분 1~20개 항목(전체 200자); timer의 fixedInputs.minutes는 정수 1~180. RoutineRunner({actionKind: 'checklist'|'timer', fixedInputs, storageKey}) 컴포넌트를 제공한다.

- [ ] 계약 경계 및 실제 타이머 종료 시각 연산을 실패 테스트로 검증.
- [ ] 자연어 분류·결정적 타이머 단축 입력·RoutineRunner·도구 페이지 구현.
- [ ] focused 검증 후 `feat: 준비물 체크리스트와 생활 타이머 추가` 커밋·푸시.

## Task 4: 보관함·편집·백업·전달 통합

Files: apps/web/app/create/*, apps/web/app/page.tsx, tests/e2e/library.spec.ts, README.md, SDD.md.

Interface: GeneratedButton에 optional favorite, updatedAt. 저장/편집/공유/백업 모두 parseButtonIntent로 검사. 백업은 {format:'hanbeonman-buttons', version:1, buttons:[…]}. 공유는 /create#button=encodeURIComponent(JSON.stringify(createIntent)). 파일과 링크는 실행하지 않고 검토한다.

- [ ] 중복 ID·손상 데이터·내보내기/가져오기·한도 초과·잘못된 작업 계약 실패 테스트 추가.
- [ ] 보관함 저장 함수, 편집기, 백업/복원, 링크 초안, 실행기와 템플릿 연결.
- [ ] 생성→편집→저장→실행, 삭제 복구, 파일·링크 복원 브라우저 테스트.
- [ ] 전체 테스트·타입·빌드·비밀 검사, 화면 검토 후 `feat: 내 버튼 편집과 백업 공유 완성` 커밋·푸시.
- [ ] 배포 API·화면 확인 및 SDD 완료/후속 항목 갱신.
