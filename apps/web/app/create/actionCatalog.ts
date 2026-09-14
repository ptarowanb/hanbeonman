import type { ButtonActionKind, ButtonInputType } from "@hanbeonman/contracts";
import type { CreateIntent } from "./buttonStorage";
import { buildDirectionsUrl } from "./sharingActions";

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
  qr_code:{label:"QR코드 만들기",symbol:"▦",description:"링크와 글을 QR 이미지로 저장",defaults:{},fields:[{key:"text",label:"QR에 담을 내용",type:"text",kind:"multiline",placeholder:"링크나 글을 200자 이내로 입력해주세요."}]},
  directions:{label:"길찾기",symbol:"↗",description:"저장한 목적지로 가는 길 확인",defaults:{mode:"transit"},fields:[{key:"destination",label:"목적지",type:"text",placeholder:"예: 서울역, 인천공항 제1터미널"},{key:"origin",label:"출발지",type:"text",optional:true,placeholder:"비워두면 지도에서 현재 위치를 사용해요."},{key:"mode",label:"이동 수단",type:"text",optional:true,options:[["transit","대중교통"],["driving","자동차"],["walking","도보"],["bicycling","자전거"]]}]},
  text_copy:{label:"주소·안내문 복사",symbol:"□",description:"자주 보내는 글을 바로 복사",defaults:{},fields:[{key:"text",label:"복사할 글",type:"text",kind:"multiline",placeholder:"주소나 안내문을 200자 이내로 입력해주세요."}]},
  discount:{label:"할인 계산",symbol:"%",description:"할인 후 금액과 절약한 금액",defaults:{rate:20},fields:[{key:"price",label:"정가(원)",type:"text",kind:"number",min:0,max:1e12,step:1},{key:"rate",label:"할인율(%)",type:"text",kind:"number",min:0,max:100}]},
  unit_price:{label:"상품 단가 비교",symbol:"=",description:"같은 무게·용량으로 가격 비교",defaults:{unit:"g"},fields:[{key:"priceA",label:"A 가격(원)",type:"text",kind:"number",min:0,max:1e12,step:1},{key:"quantityA",label:"A 수량",type:"text",kind:"number",min:.001,max:1e9},{key:"priceB",label:"B 가격(원)",type:"text",kind:"number",min:0,max:1e12,step:1},{key:"quantityB",label:"B 수량",type:"text",kind:"number",min:.001,max:1e9},{key:"unit",label:"공통 단위",type:"text",optional:true,options:[["g","그램(g)"],["ml","밀리리터(ml)"],["개","개수(개)"]]}]},
  recipe_scale:{label:"레시피 분량 조절",symbol:"×",description:"만들 인분에 맞춰 재료 계산",defaults:{baseServings:2,targetServings:4,ingredients:"쌀 200 g\n물 300 ml"},fields:[{key:"baseServings",label:"기본 인분",type:"text",kind:"number",min:.1,max:1000},{key:"targetServings",label:"만들 인분",type:"text",kind:"number",min:.1,max:1000},{key:"ingredients",label:"재료 목록",type:"text",kind:"multiline",placeholder:"한 줄에 재료명 수량 단위\n예: 쌀 200 g\n설탕 1/2 큰술"}]},
};
export const ACTION_KINDS = Object.keys(ACTIONS) as ButtonActionKind[];
export const ACTION_GROUPS = {
  all: {label:"전체",kinds:ACTION_KINDS},
  travel: {label:"외출·이동",kinds:["weather","bus_schedule","directions"]},
  daily: {label:"일상·루틴",kinds:["checklist","timer","dday","counter","random_pick","recipe_scale"]},
  calculate: {label:"쇼핑·계산",kinds:["split_bill","unit_convert","discount","unit_price"]},
  content: {label:"사진·공유",kinds:["photo_compress","text_cleanup","qr_code","text_copy"]},
} satisfies Record<string, {label:string;kinds:ButtonActionKind[]}>;
export type ActionGroup = keyof typeof ACTION_GROUPS;
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
  if(actionKind==="directions") return buildDirectionsUrl(inputs);
  if(actionKind!=="bus_schedule" && actionKind!=="photo_compress") return null;
  const params=new URLSearchParams();
  for(const field of ACTIONS[actionKind].fields) if(inputs[field.key]!==undefined) params.set(field.key,String(inputs[field.key]));
  if(actionKind==="bus_schedule") params.set("auto","1");
  return `${actionKind==="bus_schedule"?"/bus":"/photo"}?${params}`;
}
