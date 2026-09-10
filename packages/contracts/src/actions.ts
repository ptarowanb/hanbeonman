export type ActionKind = "bus_schedule" | "photo_compress" | "weather";

export type ActionDefinition = {
  kind: ActionKind;
  label: string;
  summary: string;
  href: "/bus" | "/photo" | "/weather";
  executionTarget: "server" | "recipient_browser";
};

export const actionRegistry = [
  {
    kind: "bus_schedule",
    label: "고속버스 시간표",
    summary: "저장한 노선을 버튼 하나로 오늘 다시 조회합니다.",
    href: "/bus",
    executionTarget: "server",
  },
  {
    kind: "photo_compress",
    label: "사진 압축 ZIP",
    summary: "사진을 정한 크기로 줄여 ZIP 파일로 만듭니다.",
    href: "/photo",
    executionTarget: "recipient_browser",
  },
  {
    kind: "weather",
    label: "오늘 날씨",
    summary: "도시를 고르면 현재 기온과 강수 정보를 보여줍니다.",
    href: "/weather",
    executionTarget: "server",
  },
] as const satisfies readonly ActionDefinition[];

export function getActionDefinition(kind: string): ActionDefinition | undefined {
  return actionRegistry.find((action) => action.kind === kind);
}
