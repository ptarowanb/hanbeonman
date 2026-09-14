"use client";

import { parseButtonIntent, type ButtonIntent } from "@hanbeonman/contracts";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { ACTIONS, ACTION_KINDS, ACTION_GROUPS, type ActionGroup, actionSummary, makeTemplate } from "./actionCatalog";
import { STORAGE_KEY, MAX_BUTTONS, MAX_BACKUP_SIZE, buildButtonShareUrl, buttonToIntent, createGeneratedButton, exportButtonBackup, importButtonBackup, mergeButtonBackup, parseGeneratedButtons, parseSharedButton, writeGeneratedButtons, type CreateIntent, type GeneratedButton } from "./buttonStorage";
import DraftEditor from "./DraftEditor";
import ButtonRunner from "./ButtonRunner";
import ActionIcon from "../components/ActionIcon";
import "./library.css";

type ClarifyIntent = Extract<ButtonIntent,{intent:"clarify"}>;
const messageOf=(error:unknown)=>error instanceof Error?error.message:"처리 중 문제가 발생했습니다. 다시 시도해주세요.";

export default function CreateButtonTool() {
  const [request,setRequest]=useState("");
  const [activeRequest,setActiveRequest]=useState("");
  const [answer,setAnswer]=useState("");
  const [clarification,setClarification]=useState<ClarifyIntent|null>(null);
  const [draft,setDraft]=useState<CreateIntent|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editorVersion,setEditorVersion]=useState(0);
  const [buttons,setButtons]=useState<GeneratedButton[]>([]);
  const [notice,setNotice]=useState("");
  const [isLoading,setIsLoading]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("all");
  const [templateQuery,setTemplateQuery]=useState("");
  const [templateGroup,setTemplateGroup]=useState<ActionGroup>("all");
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [deleted,setDeleted]=useState<GeneratedButton|null>(null);
  const [running,setRunning]=useState<GeneratedButton|null>(null);
  const [runVersion,setRunVersion]=useState(0);
  const [shareLink,setShareLink]=useState("");
  const editorRef=useRef<HTMLDivElement>(null);
  const resultRef=useRef<HTMLDivElement>(null);
  const pendingRequest=useRef<AbortController|null>(null);

  useEffect(()=>{
    try { setButtons(parseGeneratedButtons(localStorage.getItem(STORAGE_KEY))); }
    catch { setNotice("이 브라우저의 저장 공간을 읽을 수 없습니다. 저장 설정을 확인해주세요."); }
    setLoaded(true);
    function readShare() {
      try {
        const shared=parseSharedButton(location.hash);
        if(shared){setDraft(shared);setEditingId(null);setEditorVersion(v=>v+1);setNotice("전달받은 버튼 설정입니다. 내용을 확인한 뒤 내 버튼으로 저장해주세요.");}
      }catch(error){setNotice(messageOf(error));}
    }
    function onStorage(event:StorageEvent){if(event.key===STORAGE_KEY)setButtons(parseGeneratedButtons(event.newValue));}
    readShare();window.addEventListener("hashchange",readShare);window.addEventListener("storage",onStorage);
    return ()=>{pendingRequest.current?.abort();window.removeEventListener("hashchange",readShare);window.removeEventListener("storage",onStorage);};
  },[]);
  useEffect(()=>{if(draft)editorRef.current?.scrollIntoView({block:"nearest"});},[draft,editorVersion]);
  useEffect(()=>{if(running)resultRef.current?.scrollIntoView({block:"nearest"});},[running]);

  function persist(next:GeneratedButton[]):boolean {
    try {writeGeneratedButtons(localStorage,next);setButtons(next);return true;}
    catch(error){setNotice(messageOf(error));return false;}
  }
  function showDraft(value:CreateIntent,id:string|null=null) {
    pendingRequest.current?.abort();setIsLoading(false);
    setDraft(value);setEditingId(id);setEditorVersion(v=>v+1);setClarification(null);setNotice("");setShareLink("");
  }
  async function interpret(value:string) {
    const text=value.trim();
    if(!text){setNotice("만들고 싶은 작업을 입력해주세요.");return;}
    pendingRequest.current?.abort();
    const controller=new AbortController();pendingRequest.current=controller;
    const timeout=setTimeout(()=>controller.abort(),15000);
    setIsLoading(true);setDraft(null);setClarification(null);setNotice("");
    try {
      const response=await fetch("/api/buttons/interpret",{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({message:text}),signal:controller.signal});
      const payload=await response.json().catch(()=>null);
      if(controller!==pendingRequest.current)return;
      if(!response.ok){
        if(response.status===401||response.status===403){setNotice("Vercel 배포 보호로 요청이 차단됐습니다. 잠시 후 다시 시도해주세요.");return;}
        throw new Error(payload?.error?.message??"요청을 해석하지 못했습니다. 아래 생활 작업에서 직접 선택할 수도 있어요.");
      }
      const parsed=parseButtonIntent(payload);
      if(!parsed.success)throw new Error("버튼 내용을 확인하지 못했습니다. 작업을 조금 더 구체적으로 알려주세요.");
      const intent=parsed.data;
      if(intent.intent==="unsupported"){setNotice(`${intent.unsupportedReason} 아래에서 사용할 작업을 선택해주세요.`);return;}
      if(intent.intent==="clarify"){setClarification(intent);setAnswer("");return;}
      setDraft({...intent,intent:"create_button"});setEditingId(null);setEditorVersion(v=>v+1);
      setNotice("버튼 초안을 만들었습니다. 이름과 조건을 확인한 뒤 저장해주세요.");
    } catch(error) {
      if(controller===pendingRequest.current)setNotice(controller.signal.aborted?"응답이 늦어지고 있어요. 다시 시도하거나 아래 작업을 선택해주세요.":messageOf(error));
    } finally {clearTimeout(timeout);if(controller===pendingRequest.current)setIsLoading(false);}
  }
  function submitRequest(event:FormEvent){event.preventDefault();setActiveRequest(request.trim());void interpret(request);}
  function submitAnswer(event:FormEvent){event.preventDefault();const next=`${activeRequest}\n추가 정보: ${answer.trim()}`;setActiveRequest(next);void interpret(next);}
  function saveDraft(intent:CreateIntent){
    try {
      const old=buttons.find(button=>button.id===editingId);
      const nextButton=old?{...old,...intentFields(intent),updatedAt:new Date().toISOString()}:createGeneratedButton(intent);
      const next=old?buttons.map(button=>button.id===old.id?nextButton:button):[nextButton,...buttons];
      if(!persist(next))return;
      setDraft(null);setEditingId(null);setRunning(null);setNotice(`${nextButton.title} 버튼을 ${old?"수정":"저장"}했습니다.`);
      if(location.hash.startsWith("#button="))history.replaceState(null,"","/create#saved-buttons");
    }catch(error){setNotice(messageOf(error));}
  }
  function remove(button:GeneratedButton){
    if(!persist(buttons.filter(item=>item.id!==button.id)))return;
    setDeleted(button);if(running?.id===button.id)setRunning(null);
    setNotice(`${button.title} 버튼을 삭제했습니다. 삭제 취소로 복원할 수 있어요.`);
  }
  function duplicate(button:GeneratedButton){
    try {const copy=createGeneratedButton({...buttonToIntent(button),title:`${button.title.slice(0,75)} 복사본`});if(persist([copy,...buttons]))setNotice(`${button.title} 버튼을 복제했습니다.`);}
    catch(error){setNotice(messageOf(error));}
  }
  function downloadBackup(){
    try {
    const url=URL.createObjectURL(new Blob([exportButtonBackup(buttons)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="hanbeonman-buttons.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice("백업 파일을 내려받았습니다. 다른 기기에서 불러올 수 있어요.");
    } catch(error) { setNotice(messageOf(error)); }
  }
  async function importBackup(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    try{
      if(file.size>MAX_BACKUP_SIZE)throw new Error("백업 파일은 200KB 이하여야 합니다.");
      const incoming=importButtonBackup(await file.text());
      // Re-read after the file operation so another tab's changes are preserved.
      const current=parseGeneratedButtons(localStorage.getItem(STORAGE_KEY));
      const next=mergeButtonBackup(current,incoming);
      if(persist(next))setNotice(`${next.length-current.length}개 버튼을 불러왔습니다. 기존 버튼은 그대로 보관됩니다.`);
    }catch(error){setNotice(messageOf(error));}
  }
  async function share(button:GeneratedButton){
    try {
      const url=buildButtonShareUrl(button,location.origin);setShareLink(url);
      try{await navigator.clipboard.writeText(url);setNotice("버튼 설정 링크를 복사했습니다.");}
      catch{setNotice("아래 링크를 선택해 복사해주세요.");}
    }catch(error){setNotice(messageOf(error));}
  }
  const visible=buttons.filter(button=>(category==="all"||button.actionKind===category)&&(!onlyFavorites||button.favorite)&&(`${button.title} ${button.summary} ${actionSummary(button)}`).toLocaleLowerCase("ko").includes(query.trim().toLocaleLowerCase("ko"))).sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite)));
  const templateKinds=new Set<string>(ACTION_GROUPS[templateGroup].kinds);
  const visibleTemplates=ACTION_KINDS.filter(kind=>templateKinds.has(kind)&&`${ACTIONS[kind].label} ${ACTIONS[kind].description}`.toLocaleLowerCase("ko").includes(templateQuery.trim().toLocaleLowerCase("ko")));
  return <>
    <nav className="library-jump" aria-label="버튼 화면 바로가기"><a href="#action-templates">생활 도구 <span className="library-count">{ACTION_KINDS.length}</span></a><a href="#saved-buttons">내 버튼 <span className="library-count">{buttons.length}</span></a><span className="library-storage-note"><i aria-hidden="true"/>이 브라우저에 저장돼요</span></nav>
    <section className="create-tool" aria-labelledby="create-tool-title">
      <div className="create-tool-heading"><span className="composer-icon" aria-hidden="true">✧</span><div><h2 id="create-tool-title">어떤 일을 간단하게 만들까요?</h2><p>“날씨”처럼 짧게 적어도 좋아요. 필요한 정보는 이어서 물어볼게요.</p></div></div>
      <form className="create-form" onSubmit={submitRequest}><label className="sr-only" htmlFor="button-request">만들고 싶은 작업</label><textarea id="button-request" value={request} onChange={event=>setRequest(event.target.value)} placeholder="예: 인천 날씨, 25분 집중 타이머" maxLength={1000}/><div className="create-form-footer"><span>내 말로 만들기 <span className="composer-count">{request.length}/1,000</span></span><button className="create-submit" type="submit" disabled={isLoading}>{isLoading?"만드는 중…":"버튼 만들기"}<span aria-hidden="true"> ↗</span></button></div></form>
      {notice&&<p className="create-notice" role="status">{notice}</p>}
      {clarification&&<form className="create-clarify" onSubmit={submitAnswer}><p className="create-card-label">한 가지만 더 알려주세요</p><p className="create-question">{clarification.clarifyingQuestion}</p><label htmlFor="button-clarification">추가 정보</label><div className="create-clarify-row"><textarea id="button-clarification" value={answer} onChange={event=>setAnswer(event.target.value)} maxLength={200} required rows={2} placeholder="질문에 대한 답을 적어주세요. 목록은 한 줄에 하나씩 입력할 수 있어요."/><button className="create-secondary" type="submit" disabled={isLoading}>이 정보로 계속</button></div><button className="library-text-button" type="button" onClick={()=>showDraft({...clarification,intent:"create_button",clarifyingQuestion:null})}>실행할 때 물어보는 버튼으로 만들기</button></form>}
      <div ref={editorRef}>{draft&&<DraftEditor key={editorVersion} intent={draft} onSave={saveDraft} onCancel={()=>{setDraft(null);setEditingId(null);}} isEditing={Boolean(editingId)}/>}</div>
    </section>
    <section id="action-templates" className="library-templates" aria-labelledby="templates-title"><div className="library-section-heading"><div><h2 id="templates-title">생활 도구</h2><p>하나를 골라 내 일상에 맞게 바꿔보세요.</p></div><span className="library-section-count" aria-live="polite">{visibleTemplates.length} / {ACTION_KINDS.length}가지 도구</span></div>
      <div className="library-template-filters"><div className="library-categories" aria-label="생활 도구 분류">{(Object.keys(ACTION_GROUPS) as ActionGroup[]).map(group=><button key={group} type="button" aria-pressed={templateGroup===group} onClick={()=>setTemplateGroup(group)}>{ACTION_GROUPS[group].label}</button>)}</div><label className="library-field library-template-search"><span className="sr-only">생활 도구 검색</span><input type="search" placeholder="도구 검색" value={templateQuery} onChange={event=>setTemplateQuery(event.target.value)}/></label></div>
      {!visibleTemplates.length&&<div className="library-template-empty"><p>조건에 맞는 도구가 없어요.</p><button type="button" className="library-text-button" onClick={()=>{setTemplateQuery("");setTemplateGroup("all");}}>도구 검색 초기화</button></div>}
      <div className="library-template-grid">{visibleTemplates.map(kind=><button key={kind} type="button" aria-label={`${ACTIONS[kind].label} 템플릿`} onClick={()=>showDraft(makeTemplate(kind))}><span className="library-symbol"><ActionIcon kind={kind}/></span><span className="library-template-copy"><strong>{ACTIONS[kind].label}</strong><small>{ACTIONS[kind].description}</small></span><span className="library-template-cta" aria-hidden="true">↗</span></button>)}</div></section>
    <section id="saved-buttons" className="create-saved library-saved" aria-labelledby="saved-buttons-title">
      <div className="create-saved-heading"><div><h2 id="saved-buttons-title">내 보관함</h2><p className="library-section-description">한 번 만들어 둔 버튼, 필요할 때 바로 실행하세요.</p></div><span>{buttons.length} / {MAX_BUTTONS}</span></div>
      <div className="library-filters"><label className="library-field"><span>내 버튼 검색</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름, 지역, 조건 검색"/></label><label className="library-field"><span>작업 종류</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">전체 작업</option>{ACTION_KINDS.map(kind=><option key={kind} value={kind}>{ACTIONS[kind].label}</option>)}</select></label><button className="create-secondary" type="button" aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(!onlyFavorites)}>★ 즐겨찾기만</button></div>
      {deleted&&<div className="library-undo"><span>마지막으로 삭제한 버튼: {deleted.title}</span><button className="create-secondary" type="button" onClick={()=>{if(persist(buttons.some(button=>button.id===deleted.id)?buttons:[deleted,...buttons])){setDeleted(null);setNotice("삭제한 버튼을 복원했습니다.");}}}>삭제 취소</button></div>}
      {shareLink&&<div className="library-share"><label className="library-field"><span>버튼 설정 링크</span><input value={shareLink} readOnly onFocus={event=>event.target.select()}/></label><p>링크에는 버튼의 이름과 조건이 포함됩니다. 받은 사람이 자기 기기에 저장하는 독립된 복사본이며, 보낸 뒤 회수하거나 원격으로 수정할 수 없습니다.</p><button className="library-text-button" type="button" onClick={()=>setShareLink("")}>링크 닫기</button></div>}
      <div ref={resultRef}>{running&&<section className="library-result" aria-labelledby="run-title"><div className="library-result-heading"><div><p className="eyebrow">실행 결과</p><h3 id="run-title">{running.title}</h3></div><button className="create-secondary" type="button" onClick={()=>setRunning(null)}>결과 닫기</button></div><ButtonRunner key={`${running.id}-${runVersion}-${running.updatedAt??running.createdAt}`} button={running}/></section>}</div>
      {!loaded?<p>저장한 버튼을 불러오고 있어요…</p>:visible.length?<ul className="library-button-grid">{visible.map(button=><li key={button.id}>
        <button className="library-run-button" type="button" aria-label={`${button.title} 실행`} onClick={()=>{setRunning({...button});setRunVersion(value=>value+1);setNotice("");}}><span className="library-button-kind"><ActionIcon kind={button.actionKind} size={17}/> {ACTIONS[button.actionKind].label}</span><strong>{button.title}</strong><span>{actionSummary(button)}</span><small>실행하기 <span aria-hidden="true">↗</span></small></button>
        <div className="library-button-actions"><button type="button" aria-label={`${button.title} 즐겨찾기`} aria-pressed={Boolean(button.favorite)} onClick={()=>persist(buttons.map(item=>item.id===button.id?{...item,favorite:!item.favorite}:item))}>{button.favorite?"★":"☆"}</button><button type="button" aria-label={`${button.title} 수정`} onClick={()=>showDraft(buttonToIntent(button),button.id)}>수정</button><button type="button" aria-label={`${button.title} 복제`} onClick={()=>duplicate(button)}>복제</button><button type="button" aria-label={`${button.title} 링크 복사`} onClick={()=>void share(button)}>링크</button><button type="button" aria-label={`${button.title} 삭제`} onClick={()=>remove(button)}>삭제</button></div>
      </li>)}</ul>:<p className="create-saved-empty">{buttons.length?"검색 조건에 맞는 버튼이 없어요. 다른 이름이나 종류를 선택해주세요.":"아직 저장한 버튼이 없어요. 위에서 작업을 말하거나 골라보세요."}</p>}
      <div className="library-backup"><h3>버튼을 다른 기기로 옮기기</h3><p>버튼은 현재 브라우저에 저장됩니다. 브라우저 데이터를 지우기 전에 백업해주세요. 백업에는 버튼 설정만 담기며 사진과 실행 중인 타이머·체크 기록은 담기지 않습니다.</p><div className="library-actions"><button className="create-secondary" type="button" onClick={downloadBackup} disabled={!buttons.length}>백업 내려받기</button><label className="create-secondary library-file-label">백업 파일 불러오기<input type="file" accept=".json,application/json" onChange={event=>void importBackup(event)} /></label></div></div>
    </section>
  </>;
}
function intentFields(intent:CreateIntent) { return {title:intent.title,summary:intent.summary,actionKind:intent.actionKind,fixedInputs:intent.fixedInputs,requiredInputs:intent.requiredInputs}; }
