import { AuraController } from "../aura-engine.mjs";

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const toast = (message) => {
  const node=$("#site-toast");
  if(!node) return;
  node.textContent=message; node.classList.add("show");
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

// Shared language selector for interface labels.
const translations={
  en:{home:"Overview",projects:"Projects",studio:"Workspace",company:"Company",about:"About VEYROST",research:"Research",contact:"Contact",move:"MOVE ITEMS",done:"FINISH EDIT",auraOn:"AURA ON",auraOff:"AURA OFF",editHint:"Layout editing is active. Drag cards or categories to rearrange them.",saved:"Workspace arrangement saved."},
  ru:{home:"Обзор",projects:"Проекты",studio:"Рабочая среда",company:"Компания",about:"О VEYROST",research:"Исследования",contact:"Контакты",move:"ПЕРЕМЕСТИТЬ",done:"ЗАВЕРШИТЬ",editHint:"Режим редактирования. Перетаскивайте карточки и категории.",saved:"Расположение сохранено."},
  tj:{home:"Шарҳи умумӣ",projects:"Лоиҳаҳо",studio:"Муҳити корӣ",company:"Ширкат",about:"Дар бораи VEYROST",research:"Таҳқиқот",contact:"Тамос",move:"ҶОЙИВАЗКУНӢ",done:"АНҶОМ",editHint:"Режими таҳрир фаъол аст. Корт ё категорияро кашед.",saved:"Ҷойгиршавӣ нигоҳ дошта шуд."}
};
let language=localStorage.getItem("veyrost-language")||"en";
function applyLanguage(){
  const t=translations[language]||translations.en;
  $$("[data-label]").forEach(el=>{const key=el.dataset.label;if(t[key])el.textContent=t[key]});
  $$("[data-lang]").forEach(el=>el.classList.toggle("active",el.dataset.lang===language));
  document.documentElement.lang=language;
}
$$("[data-lang]").forEach(button=>button.addEventListener("click",()=>{
  language=button.dataset.lang||"en";
  try{localStorage.setItem("veyrost-language",language)}catch(_){}
  applyLanguage();
}));
applyLanguage();

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
  movable().forEach(el=>{
    const value=(el.style.translate||"0px 0px").split(/\s+/);
    const x=Number.parseFloat(value[0])||0,y=Number.parseFloat(value[1])||0;
    if(x||y)positions[el.dataset.layoutId]={x,y};
  });
  try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(positions));toast((translations[language]||translations.en).saved)}catch(_){toast("Could not save this layout on the device.")};
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
  editMode=Boolean(value)&&Boolean(controller?.active);
  document.documentElement.classList.toggle("veyrost-layout-editing",editMode);
  editButton?.classList.toggle("visible",Boolean(controller?.active));
  if(editButton){
    editButton.hidden=!controller?.active;
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
      auraButton.textContent=active?(translations[language]||translations.en).auraOn:(translations[language]||translations.en).auraOff;
      auraButton.disabled=state==="starting"||state==="loading";
      if(status){
        status.style.display=state==="off"?"none":"block";
        status.textContent=message||state.toUpperCase();
      }
      if(!active)setEditMode(false);
      else if(editButton)editButton.hidden=false;
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
    if(controller.active){await controller.stop();setEditMode(false);return}
    try{await controller.start()}catch(error){toast(error?.message||"AURA could not start.");}
  });
  window.addEventListener("pagehide",()=>{setEditMode(false);void controller.stop({notify:false})});
}
editButton?.classList.remove("visible");
if(editButton)editButton.hidden=true;

// Project directory search/filter.
const projectGrid=$("#project-grid");
if(projectGrid&&Array.isArray(window.VEYROST_PROJECTS)){
  const input=$("#project-search"),filter=$("#project-filter"),count=$("#project-count");
  const all=window.VEYROST_PROJECTS;
  const render=()=>{
    const query=(input?.value||"").trim().toLowerCase();
    const group=filter?.value||"All";
    const list=all.filter(p=>(group==="All"||p.group===group)&&
      [p.name,p.repo,p.group,p.type,p.language,p.description].join(" ").toLowerCase().includes(query));
    projectGrid.innerHTML=list.length?list.map(p=>`
      <article class="card project-card" data-veyrost-layout-item data-layout-id="project-${p.id}">
        <div class="card-foot"><span class="tag purple">${escapeHTML(p.group)}</span><span class="tag">${escapeHTML(p.status)}</span></div>
        <h3>${escapeHTML(p.name)}</h3><div class="project-repo">${escapeHTML(p.repo)} · ${escapeHTML(p.language)}</div>
        <p class="description">${escapeHTML(p.description)}</p>
        <div class="project-meta"><span class="tag">${escapeHTML(p.type)}</span><span class="tag">${escapeHTML(p.updated)}</span></div>
        <div class="card-foot"><span class="project-repo">★ ${p.stars}</span><a class="arrow-link" href="${p.url}" target="_blank" rel="noopener">SOURCE REPOSITORY ↗</a></div>
      </article>`).join(""):'<div class="empty-state">No projects match this search. Try another term or category.</div>';
    if(count)count.textContent=`${list.length} / ${all.length} PUBLIC PROJECTS`;
    registerMovable();restorePositions();
  };
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
  input?.addEventListener("input",render);filter?.addEventListener("change",render);render();
}

// Settings switches are deliberately local preferences, not fake cloud controls.
$$("[data-local-toggle]").forEach(button=>{
  const key="veyrost-setting:"+button.dataset.localToggle;
  const saved=localStorage.getItem(key);
  const value=saved===null?button.dataset.default==="true":saved==="true";
  button.setAttribute("aria-checked",String(value));
  button.addEventListener("click",()=>{
    const next=button.getAttribute("aria-checked")!=="true";
    button.setAttribute("aria-checked",String(next));
    localStorage.setItem(key,String(next));
    if(button.dataset.localToggle==="reduced-motion")document.documentElement.classList.toggle("reduced-motion",next);
    toast("Preference saved on this device.");
  });
});
