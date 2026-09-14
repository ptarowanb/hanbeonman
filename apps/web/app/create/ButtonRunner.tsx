"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { parseButtonIntent } from "@hanbeonman/contracts";
import { ACTIONS, getActionHref } from "./actionCatalog";
import { buttonToIntent, type GeneratedButton } from "./buttonStorage";
import ActionFieldControl from "./ActionFieldControl";
import RoutineRunner from "../routines/RoutineRunner";
import UtilityRunner from "./UtilityRunner";
import { WeatherResultCard, type WeatherApiResult } from "../weather/WeatherResultCard";

export default function ButtonRunner({ button }: { button: GeneratedButton }) {
  const [inputs,setInputs]=useState(button.fixedInputs);
  const pending=button.requiredInputs.filter(input=>input.type!=="image_files" && !(button.actionKind==="text_cleanup"&&input.key==="text"));
  const [ready,setReady]=useState(pending.length===0);
  const [entered,setEntered]=useState<Record<string,string>>({});
  const [error,setError]=useState("");
  const [weather,setWeather]=useState<WeatherApiResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const requestId=useRef(0);
  useEffect(()=>{
    if(!ready) return;
    const href=getActionHref(button.actionKind, inputs);
    if(href){window.location.assign(href);return;}
    if(button.actionKind!=="weather") return;
    const controller=new AbortController();
    const id=++requestId.current;
    const timeout=setTimeout(()=>controller.abort(),12000);
    setLoading(true);setError("");setWeather(null);
    void fetch(`/api/weather?city=${encodeURIComponent(String(inputs.city))}`,{signal:controller.signal})
      .then(async response=>{
        const payload=await response.json();
        if(!response.ok||payload.status!=="OK")throw new Error(payload.status==="EMPTY"?"지역을 찾지 못했습니다. 버튼의 지역을 수정해주세요.":"날씨를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        if(requestId.current===id)setWeather(payload as WeatherApiResult);
      }).catch(reason=>{if(!controller.signal.aborted&&requestId.current===id)setError(reason instanceof Error?reason.message:"날씨 조회에 실패했습니다.");else if(requestId.current===id)setError("응답 시간이 길어졌습니다. 다시 시도해주세요.");})
      .finally(()=>{clearTimeout(timeout);if(requestId.current===id)setLoading(false);});
    return ()=>{requestId.current++;controller.abort();clearTimeout(timeout);};
  },[button.actionKind,inputs,ready,attempt]);
  function start(event:FormEvent) {
    event.preventDefault();
    const values={...button.fixedInputs};
    for(const input of pending) {
      const field=ACTIONS[button.actionKind].fields.find(f=>f.key===input.key);
      const value=entered[input.key]?.trim();
      if(value) values[input.key]=field?.kind==="number"?Number(value):value;
    }
    const candidate={...buttonToIntent(button),fixedInputs:values,requiredInputs:button.requiredInputs.filter(input=>!pending.some(p=>p.key===input.key))};
    const checked=parseButtonIntent(candidate);
    if(!checked.success){setError("입력값과 단위를 확인해주세요. 필요한 값을 모두 입력해주세요.");return;}
    setError("");setInputs(values);setReady(true);
  }
  if(!ready)return <form className="library-run-inputs" onSubmit={start}><p>이번 실행에 필요한 정보만 알려주세요.</p>{pending.map(input=>{
    const field=ACTIONS[button.actionKind].fields.find(f=>f.key===input.key)??{key:input.key,label:input.label,type:input.type};
    return <ActionFieldControl key={input.key} field={field} value={entered[input.key]??""} onChange={value=>setEntered({...entered,[input.key]:value})} required={input.required}/>;
  })}{error&&<p role="alert" className="library-error">{error}</p>}<button type="submit" className="create-submit">이 정보로 실행</button></form>;
  if(button.actionKind==="weather")return <div aria-busy={loading}>{loading&&<p role="status">최신 날씨를 확인하고 있어요…</p>}{error&&<p role="alert" className="library-error">{error}</p>}{weather&&<WeatherResultCard result={weather}/>}<button className="create-secondary" type="button" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>{error?"다시 시도":"날씨 새로고침"}</button></div>;
  if(button.actionKind==="timer"||button.actionKind==="checklist")return <RoutineRunner actionKind={button.actionKind} fixedInputs={inputs} storageKey={button.id}/>;
  if(button.actionKind==="bus_schedule"||button.actionKind==="photo_compress")return <p>저장한 조건으로 도구를 열고 있어요.</p>;
  return <UtilityRunner actionKind={button.actionKind} fixedInputs={inputs} storageKey={button.id}/>;
}
