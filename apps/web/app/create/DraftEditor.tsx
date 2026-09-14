"use client";
import { useState, type FormEvent } from "react";
import { parseButtonIntent } from "@hanbeonman/contracts";
import type { CreateIntent } from "./buttonStorage";
import { ACTIONS, actionSummary } from "./actionCatalog";
import ActionFieldControl from "./ActionFieldControl";
export default function DraftEditor({ intent, onSave, onCancel, isEditing=false }: { intent: CreateIntent; onSave: (intent: CreateIntent) => void; onCancel:()=>void; isEditing?:boolean }) {
  const [title,setTitle]=useState(intent.title);
  const [values,setValues]=useState<Record<string,string>>(Object.fromEntries(Object.entries(intent.fixedInputs).map(([key,value])=>[key,String(value)])));
  const [runtime,setRuntime]=useState<string[]>(intent.requiredInputs.map(input=>input.key));
  const [error,setError]=useState("");
  const fields=ACTIONS[intent.actionKind].fields;
  const liveFixed=Object.fromEntries(fields.filter(field=>!runtime.includes(field.key)&&values[field.key]?.trim()).map(field=>[field.key,values[field.key]!]));
  function submit(event:FormEvent) {
    event.preventDefault();
    const fixedInputs:CreateIntent["fixedInputs"]={};
    const requiredInputs:CreateIntent["requiredInputs"]=[];
    for (const field of fields) {
      if(runtime.includes(field.key)) requiredInputs.push({key:field.key,label:field.label,type:field.type,required:!field.optional});
      else if(values[field.key]?.trim()) fixedInputs[field.key]=field.kind==="number"?Number(values[field.key]):values[field.key]!.trim();
    }
    // File contents and long text are chosen in the local execution tool.
    for(const input of intent.requiredInputs) if(!fields.some(f=>f.key===input.key)) requiredInputs.push(input);
    const candidate={...intent,title:title.trim(),fixedInputs,requiredInputs};
    const parsed=parseButtonIntent(candidate);
    if(!parsed.success || parsed.data.intent!=="create_button") {
      setError(parsed.success?"설정을 확인해주세요.":parsed.error.issues.map(issue=>{
        const key=String(issue.path[1]??"");
        return `${fields.find(f=>f.key===key)?.label??"버튼 설정"}: ${issue.message}`;
      }).join(" "));
      return;
    }
    onSave(parsed.data);
  }
  return <form className="create-draft library-editor" onSubmit={submit} aria-label="버튼 설정 편집">
    <p className="create-card-label">{isEditing?"저장한 버튼 수정":"생성된 버튼 초안"}</p>
    <h3>{title || ACTIONS[intent.actionKind].label}</h3>
    <p>{ACTIONS[intent.actionKind].description}</p>
    <label className="library-field"><span>버튼 이름</span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required /></label>
    <div className="library-editor-fields">{fields.map(field=><div key={field.key}>
      <ActionFieldControl field={field} value={values[field.key]??""} onChange={value=>setValues({...values,[field.key]:value})} disabled={runtime.includes(field.key)} required={!field.optional&&!runtime.includes(field.key)} />
      <label className="library-runtime"><input type="checkbox" checked={runtime.includes(field.key)} onChange={e=>setRuntime(e.target.checked?[...runtime,field.key]:runtime.filter(key=>key!==field.key))} />{field.label} 실행할 때마다 입력</label>
    </div>)}</div>
    <dl className="create-draft-details"><div><dt>실행 작업</dt><dd>{ACTIONS[intent.actionKind].label}</dd></div><div><dt>고정 정보</dt><dd>{actionSummary({...intent,fixedInputs:liveFixed})}</dd></div><div><dt>실행할 때 묻기</dt><dd>{runtime.length?runtime.map(key=>fields.find(f=>f.key===key)?.label??"파일").join(", "):"없음"}</dd></div></dl>
    {error&&<p role="alert" className="library-error">{error}</p>}
    <div className="library-actions"><button className="create-submit" type="submit">{isEditing?"수정 저장":"이 버튼 저장"}</button><button className="create-secondary" type="button" onClick={onCancel}>취소</button></div>
  </form>;
}
