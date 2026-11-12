import { AuraController } from "../aura-engine.mjs";

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const toast = (message) => {
  const node=$("#site-toast");
  if(!node) return;
  node.dataset.sourceMessage=message;
  node.textContent=(dictionaries[language]||{})[message]||message; node.classList.add("show");
  clearTimeout(window.__veyrostToastTimer);
  window.__veyrostToastTimer=setTimeout(()=>node.classList.remove("show"),2200);
};

// Shared navigation and mobile menu.
const menu=$("#menu-toggle");
const mobile=$("#mobile-nav");
menu?.addEventListener("click",()=>{
  const open=mobile?.classList.toggle("open")||false;
  menu.setAttribute("aria-expanded",String(open));
});
$$("[data-close-menu]").forEach(link=>link.addEventListener("click",()=>mobile?.classList.remove("open")));

// Complete site localization: translate every rendered text node, not only navigation labels.
import { dictionaries } from "./veyrost-i18n.js";
let language="en";
try{language=localStorage.getItem("veyrost-language")||"en"}catch(_){}
if(!dictionaries[language])language="en";
const translations={
 en:{move:"MOVE ITEMS",done:"FINISH EDIT",auraOn:"AURA ON",auraOff:"AURA OFF",editHint:"Layout editing is active. Drag cards or categories to rearrange them.",saved:"Workspace arrangement saved."},
 ru:{move:"ПЕРЕМЕСТИТЬ БЛОКИ",done:"ЗАВЕРШИТЬ РЕДАКТИРОВАНИЕ",auraOn:"AURA ВКЛ",auraOff:"AURA ВЫКЛ",editHint:"Режим редактирования активен. Перетаскивайте карточки и категории.",saved:"Расположение сохранено."},
 tj:{move:"ҶОЙИВАЗКУНИИ ҚИСМҲО",done:"АНҶОМИ ТАҲРИР",auraOn:"AURA ФАЪОЛ",auraOff:"AURA ХОМӮШ",editHint:"Реҷаи таҳрир фаъол аст. Кортҳо ва гурӯҳҳоро ҷойиваз кунед.",saved:"Тарҳ нигоҳ дошта шуд."}
};
const originalText=new WeakMap();
const originalAttrs=new WeakMap();
function translateDocument(){
  const dict=dictionaries[language]||dictionaries.en;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const parent=node.parentElement;
    if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA|INPUT)$/.test(parent.tagName))continue;
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const source=originalText.get(node);
    const trimmed=source.trim();
    if(!trimmed)continue;
    const translated=dict[trimmed]??dictionaries.en[trimmed];
    if(translated!==undefined){
      const leading=source.match(/^\s*/)?.[0]||"";
      const trailing=source.match(/\s*$/)?.[0]||"";
      node.nodeValue=leading+translated+trailing;
    }else node.nodeValue=source;
  }
  $("[placeholder],[title],[aria-label],[data-label]").forEach(el=>{
    if(!originalAttrs.has(el))originalAttrs.set(el,{});
    const saved=originalAttrs.get(el);
    ["placeholder","title","aria-label","data-label"].forEach(name=>{
      if(el.hasAttribute(name)&&saved[name]===undefined)saved[name]=el.getAttribute(name);
      const source=saved[name];
      if(!source)return;
      const labelKeys={home:"Overview",projects:"Projects",studio:"Workspace",company:"Company",research:"Research",contact:"Contact",auraOff:"AURA OFF",auraOn:"AURA ON",move:"MOVE ITEMS"};
      const key=name==="data-label"?(labelKeys[source]||source):source;
      const value=dict[key]??dictionaries.en[key]??key;
      if(name==="data-label")el.dataset.label=source;
      else el.setAttribute(name,value);
      if(name==="aria-label")el.setAttribute(name,value);
    });
  });
  $("[data-lang]").forEach(el=>el.classList.toggle("active",el.dataset.lang===language));
  const pageTitle=document.querySelector("title");
  if(pageTitle){
    if(!pageTitle.dataset.i18nSource)pageTitle.dataset.i18nSource=pageTitle.textContent;
    pageTitle.textContent=dict[pageTitle.dataset.i18nSource]??dictionaries.en[pageTitle.dataset.i18nSource]??pageTitle.dataset.i18nSource;
  }
  const description=document.querySelector('meta[name="description"]');
  if(description){
    if(!description.dataset.i18nSource)description.dataset.i18nSource=description.content;
    description.content=dict[description.dataset.i18nSource]??dictionaries.en[description.dataset.i18nSource]??description.dataset.i18nSource;
  }
  document.documentElement.lang=language==="tj"?"tg":language;
  document.documentElement.dataset.language=language;
}
function applyLanguage(){
  translateDocument();
  const t=dictionaries[language]||dictionaries.en;
  const edit=$("#layout-toggle");
  if(edit)edit.textContent=edit.getAttribute("aria-pressed")==="true"?(translations[language]||translations.en).done:(translations[language]||translations.en).move;
  const hint=$("#edit-hint");
  if(hint)hint.textContent=(translations[language]||translations.en).editHint;
  if(status?.dataset.message)status.textContent=(dictionaries[language]||{})[status.dataset.message]||status.dataset.message;
  const toastNode=$("#site-toast");
  if(toastNode?.classList.contains("show")&&toastNode.dataset.sourceMessage)toastNode.textContent=(dictionaries[language]||{})[toastNode.dataset.sourceMessage]||toastNode.dataset.sourceMessage;
  window.dispatchEvent(new Event("veyrost:languagechange"));
  const aura=$("#aura-toggle");
  if(aura){const state=aura.getAttribute("aria-pressed")==="true";aura.textContent=state?(translations[language]||translations.en).auraOn:(translations[language]||translations.en).auraOff;}
}
$$("[data-lang]").forEach(button=>button.addEventListener("click",()=>{
  const next=button.dataset.lang||"en";
  if(!dictionaries[next])return;
  language=next;
  try{localStorage.setItem("veyrost-language",language)}catch(_){}
  applyLanguage();
}));
applyLanguage();
const languageObserver=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length))translateDocument()});
languageObserver.observe(document.body,{childList:true,subtree:true});

// Layout editor: all categories, cards and workspace modules can be repositioned.
const LAYOUT_KEY="veyrost:corporate-layout:v1";
const movable=()=>$$("[data-veyrost-layout-item]");
function registerMovable(){
  movable().forEach((el,index)=>{
    if(!el.dataset.layoutId)el.dataset.layoutId=el.id||"item-"+index;
    el.dataset.veyrostLayoutItem="true";
    el.style.willChange="transform";
  });
}
function getPositions(){
  const map=new Map();
  try{
    const saved=JSON.parse(localStorage.getItem(LAYOUT_KEY)||"{}");
    if(saved&&typeof saved==="object")Object.entries(saved).forEach(([id,p])=>{
      if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))map.set(id,p);
    });
  }catch(_){}
  return map;
}
function restorePositions(){
  const positions=getPositions();
  registerMovable();
  movable().forEach(el=>{
    const p=positions.get(el.dataset.layoutId);
    if(p)el.style.translate=p.x+"px "+p.y+"px";
  });
}
function savePositions(){
  const positions={};
  try {
    const existing=JSON.parse(localStorage.getItem(LAYOUT_KEY)||"{}");
    if(existing&&typeof existing==="object")Object.assign(positions,existing);
  } catch (_) {}
  movable().forEach(el=>{
    const value=(el.style.translate||"0px 0px").split(/\\s+/);
    const x=Number.parseFloat(value[0])||0,y=Number.parseFloat(value[1])||0;
    if(x||y)positions[el.dataset.layoutId]={x,y};
    else delete positions[el.dataset.layoutId];
  });
  try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(positions));toast("Workspace arrangement saved.")}catch(_){toast("Could not save this layout on the device.")};
}
let editMode=false,drag=null;
const editButton=$("#layout-toggle");
const editHint=$("#edit-hint");
const cursor=$("#aura-pointer");
function offset(el){
  const a=(el.style.translate||"0px 0px").split(/\s+/);
  return {x:Number.parseFloat(a[0])||0,y:Number.parseFloat(a[1])||0};
}
function startDrag(x,y,source){
  if(!editMode||drag)return false;
  const el=document.elementFromPoint(x,y)?.closest?.("[data-veyrost-layout-item]");
  if(!el)return false;
  const p=offset(el);
  drag={el,source,startX:x,startY:y,baseX:p.x,baseY:p.y,moved:false};
  return true;
}
function moveDrag(x,y,source){
  if(!drag||drag.source!==source)return;
  const dx=x-drag.startX,dy=y-drag.startY;
  if(Math.hypot(dx,dy)>3)drag.moved=true;
  drag.el.style.translate=(drag.baseX+dx)+"px "+(drag.baseY+dy)+"px";
}
function finishDrag(){
  if(!drag)return;
  const moved=drag.moved;drag=null;
  if(moved)savePositions();
}
function setEditMode(value){
  editMode=Boolean(value);
  document.documentElement.classList.toggle("veyrost-layout-editing",editMode);
  editButton?.classList.add("visible");
  if(editButton){
    editButton.hidden=false;
    editButton.textContent=editMode?(translations[language]||translations.en).done:(translations[language]||translations.en).move;
    editButton.setAttribute("aria-pressed",String(editMode));
  }
  if(editHint)editHint.hidden=!editMode;
  if(!editMode)finishDrag();
}
editButton?.addEventListener("click",()=>setEditMode(!editMode));
document.addEventListener("pointerdown",event=>{
  if(!editMode||event.button!==0)return;
  if(event.target?.closest?.("#layout-toggle"))return;
  const target=event.target?.closest?.("[data-veyrost-layout-item]");
  if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  startDrag(event.clientX,event.clientY,"pointer");
});
document.addEventListener("pointermove",event=>moveDrag(event.clientX,event.clientY,"pointer"));
document.addEventListener("pointerup",()=>{if(drag?.source==="pointer")finishDrag()});
document.addEventListener("pointercancel",()=>{if(drag?.source==="pointer")finishDrag()});
document.addEventListener("click",event=>{
  if(editMode&&event.target?.closest?.("[data-veyrost-layout-item]")){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);
restorePositions();

// AURA camera controller: single normal arrow cursor; gestures control real site elements.
const video=$("#aura-camera");
const status=$("#aura-status");
const auraButton=$("#aura-toggle");
let controller=null;
if(video&&cursor&&auraButton){
  controller=new AuraController({
    video,cursor,
    onStatus:(state,message)=>{
      const active=state==="active"||state==="paused";
      document.documentElement.classList.toggle("aura-active",active);
      auraButton.classList.toggle("active",active);
      auraButton.setAttribute("aria-pressed",String(active));
      auraButton.textContent=active?(translations[language]||translations.en).auraOn:(translations[language]||translations.en).auraOff;
      auraButton.disabled=state==="starting"||state==="loading";
      if(status){
        status.style.display=state==="off"?"none":"block";
        status.dataset.message=message||state.toUpperCase();
        status.textContent=(dictionaries[language]||{})[status.dataset.message]||status.dataset.message;
      }
    },
    onGesture:(name,detail={})=>{
      if(name==="pinch-start"&&Number.isFinite(detail.x)&&Number.isFinite(detail.y))startDrag(detail.x,detail.y,"hand");
      if(["pinch-end","pinch-cancel","cancel","hand-lost"].includes(name)&&drag?.source==="hand")finishDrag();
      if(name==="emergency-pause")toast("AURA paused.");
      if(name==="resume")toast("AURA resumed.");
    },
    onCursorMove:({x,y})=>moveDrag(x,y,"hand")
  });
  auraButton.addEventListener("click",async()=>{
    if(controller.active){if(drag?.source==="hand")finishDrag();await controller.stop();return}
    try{await controller.start()}catch(error){toast(error?.message||"AURA could not start.");}
  });
  window.addEventListener("pagehide",()=>{setEditMode(false);void controller.stop({notify:false})});
}
if(editButton){editButton.hidden=false;editButton.classList.add("visible");}

// Project directory search/filter.
const projectGrid=$("#project-grid");
if(projectGrid&&Array.isArray(window.VEYROST_PROJECTS)){
  const input=$("#project-search"),filter=$("#project-filter"),count=$("#project-count");
  const all=window.VEYROST_PROJECTS;
  const render=()=>{
    const query=(input?.value||"").trim().toLowerCase();
    const group=filter?.value||"All";
    const localeDictionary=dictionaries[language]||{};
    const list=all.filter(p=>(group==="All"||p.group===group)&&
      [p.name,p.repo,p.group,p.type,p.language,p.description,localeDictionary[p.group],localeDictionary[p.type],localeDictionary[p.status],localeDictionary[p.description]].filter(Boolean).join(" ").toLowerCase().includes(query));
    projectGrid.innerHTML=list.length?list.map(p=>`
      <article class="card project-card" data-veyrost-layout-item data-layout-id="project-${p.id}">
        <div class="card-foot"><span class="tag purple">${escapeHTML(p.group)}</span><span class="tag">${escapeHTML(p.status)}</span></div>
        <h3>${escapeHTML(p.name)}</h3><div class="project-repo">${escapeHTML(p.repo)} · ${escapeHTML(p.language)}</div>
        <p class="description">${escapeHTML(p.description)}</p>
        <div class="project-meta"><span class="tag">${escapeHTML(p.type)}</span><span class="tag">${escapeHTML(p.updated)}</span></div>
        <div class="card-foot"><span class="project-repo">${p.visibility==="private"?"PRIVATE REPOSITORY":"★ "+p.stars}</span>${p.visibility==="private"?'<span class="tag">OWNER ACCESS ONLY</span>':`<a class="arrow-link" href="${p.url}" target="_blank" rel="noopener">SOURCE REPOSITORY ↗</a>`}</div>
      </article>`).join(""):'<div class="empty-state">No projects match this search. Try another term or category.</div>';
    const publicMatches=list.filter(p=>p.visibility!=="private").length;
    const privateMatches=list.length-publicMatches;
    const locale=dictionaries[language]||{};
    if(count)count.textContent=language==="en"?`${publicMatches} PUBLIC + ${privateMatches} PRIVATE`:`${publicMatches} ${locale.PUBLIC||"PUBLIC"} + ${privateMatches} ${locale.PRIVATE||"PRIVATE"}`;
    registerMovable();restorePositions();
  };
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
  input?.addEventListener("input",render);filter?.addEventListener("change",render);
  window.addEventListener("veyrost:languagechange",render);
  render();
}

// Settings switches are deliberately local preferences, not fake cloud controls.
$$("[data-local-toggle]").forEach(button=>{
  const key="veyrost-setting:"+button.dataset.localToggle;
  let saved=null;
  try{saved=localStorage.getItem(key)}catch(_){}
  const value=saved===null?button.dataset.default==="true":saved==="true";
  button.setAttribute("aria-checked",String(value));
  button.addEventListener("click",()=>{
    const next=button.getAttribute("aria-checked")!=="true";
    button.setAttribute("aria-checked",String(next));
    let persisted=true;
    try{localStorage.setItem(key,String(next))}catch(_){persisted=false}
    if(button.dataset.localToggle==="reduced-motion")document.documentElement.classList.toggle("reduced-motion",next);
    toast(persisted?"Preference saved on this device.":"Preference changed for this session; browser storage is unavailable.");
  });
});
