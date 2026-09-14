import type { ButtonActionKind, ButtonInputType } from "@hanbeonman/contracts";
import type { CreateIntent } from "./buttonStorage";

export type ActionField = { key: string; label: string; type: ButtonInputType; kind?: "number" | "date" | "multiline"; optional?: boolean; min?: number; max?: number; step?: number; options?: readonly [string, string][]; placeholder?: string };
type ActionDefinition = { label: string; symbol: string; description: string; fields: ActionField[]; defaults: Record<string, string | number | boolean> };
const units: [string, string][] = [["mm","밀리미터"],["cm","센티미터"],["m","미터"],["km","킬로미터"],["g","그램"],["kg","킬로그램"],["celsius","섭씨"],["fahrenheit","화씨"]];
export const ACTIONS: Record<ButtonActionKind, ActionDefinition> = {
  weather: { label: "날씨 확인", symbol: "☀", description: "기온과 오늘 예보, 외출 준비까지", defaults: { city: "인천" }, fields: [{ key:"city", label:"지역", type:"city", placeholder:"예: 인천, 서울, 부산" }] },
  bus_schedule: { label:"고속버스 조회", symbol:"↗", description:"저장한 노선과 요일로 시간표 조회", defaults:{}, fields:[{key:"departure",label:"출발 터미널",type:"terminal",placeholder:"예: 서울경부"},{key:"arrival",label:"도착 터미널",type:"terminal",placeholder:"예: 대전복합"},{key:"grade",label:"버스 등급",type:"grade",optional:true},{key:"date",label:"출발일",type:"date",kind:"date",optional:true},{key:"weekday",label:"반복 요일",type:"text",kind:"number",optional:true,options:[["0","일요일"],["1","월요일"],["2","화요일"],["3","수요일"],["4","목요일"],["5","금요일"],["6","토요일"]]}] },
  photo_compress:{label:"사진 압축",symbol:"▧",description:"사진 크기와 용량을 줄여 ZIP으로",defaults:{maxEdge:1600,quality:.82},fields:[{key:"maxEdge",label:"긴 변 크기(px)",type:"text",kind:"number",min:320,max:4096,step:1,optional:true},{key:"quality",label:"사진 품질",type:"text",kind:"number",min:.1,max:1,step:.01,optional:true}]},
  checklist:{label:"준비물 체크리스트",symbol:"✓",description:"외출·여행 준비물을 빠짐없이",defaults:{items:"지갑\n휴대폰\n열쇠"},fields:[{key:"items",label:"확인할 항목",type:"text",kind:"multiline",placeholder:"한 줄에 하나씩 입력해주세요."}]},
  timer:{label:"생활 타이머",symbol:"◷",description:"집중 시간부터 요리 시간까지",defaults:{minutes:25},fields:[{key:"minutes",label:"시간(분)",type:"text",kind:"number",min:1,max:180,step:1}]},
  dday:{label:"디데이",symbol:"D",description:"여행과 기념일까지 남은 날",defaults:{event:"기다리는 날"},fields:[{key:"event",label:"일정 이름",type:"text",optional:true},{key:"date",label:"기준 날짜",type:"date",kind:"date"}]},
  split_bill:{label:"더치페이 계산",symbol:"÷",description:"인원별 금액과 나머지를 정확히",defaults:{people:3},fields:[{key:"amount",label:"금액(원)",type:"text",kind:"number",min:0,max:1e12,step:1},{key:"people",label:"인원(명)",type:"text",kind:"number",min:1,max:1000,step:1}]},
  unit_convert:{label:"단위 변환",symbol:"⇄",description:"길이·무게·온도를 원하는 단위로",defaults:{from:"cm",to:"m"},fields:[{key:"value",label:"변환할 값",type:"text",kind:"number",min:-1e12,max:1e12,step:.001},{key:"from",label:"원래 단위",type:"text",options:units},{key:"to",label:"바꿀 단위",type:"text",options:units}]},
  text_cleanup:{label:"글 정리",symbol:"Aa",description:"불필요한 공백과 중복 줄 정리",defaults:{mode:"trim"},fields:[{key:"text",label:"미리 넣을 글",type:"text",kind:"multiline",optional:true,placeholder:"기본 글은 200자 이내. 실행할 때는 20,000자까지 넣을 수 있어요."},{key:"mode",label:"정리 방식",type:"text",optional:true,options:[["trim","공백·빈 줄 정리"],["deduplicate","중복 줄도 제거"]]}]},
  random_pick:{label:"무작위 선택",symbol:"⚄",description:"메뉴와 할 일을 하나씩 뽑기",defaults:{options:"한식\n중식\n일식"},fields:[{key:"options",label:"선택지",type:"text",kind:"multiline",placeholder:"서로 다른 선택지를 한 줄에 하나씩"}]},
  counter:{label:"횟수 기록",symbol:"+1",description:"오늘의 작은 반복을 세어보세요",defaults:{step:1},fields:[{key:"step",label:"한 번에 더할 수",type:"text",kind:"number",min:1,max:1000,step:1,optional:true}]},
};
export const ACTION_KINDS = Object.keys(ACTIONS) as ButtonActionKind[];
export function makeTemplate(actionKind: ButtonActionKind): CreateIntent {
  const action=ACTIONS[actionKind];
  return { schemaVersion:"1.0",intent:"create_button",actionKind,title:action.label,summary:action.description,fixedInputs:{...action.defaults},requiredInputs:action.fields.filter(f=>!f.optional && !(f.key in action.defaults)).map(f=>({key:f.key,label:f.label,type:f.type,required:true})),clarifyingQuestion:null };
}
export function actionSummary(intent: Pick<CreateIntent,"actionKind"|"fixedInputs"|"requiredInputs">): string {
  const action=ACTIONS[intent.actionKind];
  return action.fields.filter(f=>f.key in intent.fixedInputs).map(f=>{
    const raw=String(intent.fixedInputs[f.key]);
    const shown=f.options?.find(([value])=>value===raw)?.[1] ?? raw.replace(/\n/g," · ");
    return `${f.label}: ${shown}`;
  }).join(" / ") || "실행할 때 필요한 정보를 입력해요.";
}
export function getActionHref(actionKind: ButtonActionKind, inputs: CreateIntent["fixedInputs"]): string | null {
  if(actionKind!=="bus_schedule" && actionKind!=="photo_compress") return null;
  const params=new URLSearchParams();
  for(const field of ACTIONS[actionKind].fields) if(inputs[field.key]!==undefined) params.set(field.key,String(inputs[field.key]));
  if(actionKind==="bus_schedule") params.set("auto","1");
  return `${actionKind==="bus_schedule"?"/bus":"/photo"}?${params}`;
}
