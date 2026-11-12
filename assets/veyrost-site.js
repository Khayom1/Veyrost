import "../matter-engine.js";
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

// Shared animated navigation: one vertical dropdown across all breakpoints.
const menu=$("#menu-toggle");
const mobile=$("#mobile-nav");
const closeMobileMenu=()=>{
  mobile?.classList.remove("open");
  mobile?.setAttribute("aria-hidden","true");
  menu?.setAttribute("aria-expanded","false");
  menu?.setAttribute("aria-label","Open navigation");
};
menu?.addEventListener("click",(event)=>{
  if(menu.dataset.detached==="true"||document.documentElement.classList.contains("veyrost-layout-editing")){
    event.preventDefault();event.stopImmediatePropagation();return;
  }
  const open=!mobile?.classList.contains("open");
  mobile?.classList.toggle("open",open);
  mobile?.setAttribute("aria-hidden",String(!open));
  menu.setAttribute("aria-expanded",String(open));
  menu.setAttribute("aria-label",open?"Close navigation":"Open navigation");
});
$$("[data-close-menu]").forEach(link=>link.addEventListener("click",closeMobileMenu));
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeMobileMenu()});
document.addEventListener("click",event=>{
  if(!mobile?.classList.contains("open"))return;
  if(event.target?.closest?.("#mobile-nav,#menu-toggle"))return;
  closeMobileMenu();
});
// Complete site localization: translate every rendered text node, not only navigation labels.
import { dictionaries } from "./veyrost-i18n.js?v=20261112-9";
let language="en";
try{language=localStorage.getItem("veyrost-language")||"en"}catch(_){}
if(!dictionaries[language])language="en";
const translations={
 en:{move:"MOVE ITEMS",done:"FINISH EDIT",auraOn:"AURA ON",auraOff:"AURA OFF",editHint:"Layout editing is active. Drag cards or categories to rearrange them.",saved:"Workspace arrangement saved.",menuRisk:"MENU DETACHED · SYSTEM RISK",repairMenu:"REPAIR MENU",menuRestored:"Menu button restored to its original position."},
 ru:{move:"ПЕРЕМЕСТИТЬ БЛОКИ",done:"ЗАВЕРШИТЬ РЕДАКТИРОВАНИЕ",auraOn:"AURA ВКЛ",auraOff:"AURA ВЫКЛ",editHint:"Режим редактирования активен. Перетаскивайте карточки и категории.",saved:"Расположение сохранено.",menuRisk:"КНОПКА МЕНЮ СМЕЩЕНА · РИСК СИСТЕМЫ",repairMenu:"ВОССТАНОВИТЬ МЕНЮ",menuRestored:"Кнопка меню возвращена на исходное место."},
 tj:{move:"ҶОЙИВАЗКУНИИ ҚИСМҲО",done:"АНҶОМИ ТАҲРИР",auraOn:"AURA ФАЪОЛ",auraOff:"AURA ХОМӮШ",editHint:"Реҷаи таҳрир фаъол аст. Кортҳо ва гурӯҳҳоро ҷойиваз кунед.",saved:"Тарҳ нигоҳ дошта шуд.",menuRisk:"ТУГМАИ МЕНЮ ҶОЙИ ХУДРО ТАРК КАРД · ХАТАРИ СИСТЕМАВӢ",repairMenu:"МЕНЮРО ДУРУСТ КУН",menuRestored:"Тугмаи меню ба ҷойи аслиаш баргашт."}
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
  $$("[placeholder],[title],[aria-label],[data-label]").forEach(el=>{
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
  $$("[data-lang]").forEach(el=>el.classList.toggle("active",el.dataset.lang===language));
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
  const statusNode=$("#aura-status");
  if(statusNode?.dataset.message)statusNode.textContent=(dictionaries[language]||{})[statusNode.dataset.message]||statusNode.dataset.message;
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

// Layout editor: movable modules with two-step protection for Menu and Settings.
const movable=()=>$$("[data-veyrost-layout-item]");
function registerMovable(){
  movable().forEach((el,index)=>{
    if(!el.dataset.layoutId)el.dataset.layoutId=el.id||"item-"+index;
    el.dataset.veyrostLayoutItem="true";
    el.style.willChange="transform";
  });
}
function restorePositions(){
  registerMovable();
  // Layout edits are session-only: always restore the authored layout on page load.
  movable().forEach(el=>{el.style.translate="0px 0px"});
}
function savePositions(){
  // Deliberately do not persist positions. Refreshing the site restores the original layout.
  toast("Temporary layout applied. Refresh to restore the original positions.");
}
let editMode=false,drag=null;
const editButton=$("#layout-toggle");
const physicalBodies=new Map();
let physicsWorld=null,physicsFrame=0;
function clearButtonPhysics(){
  if(physicsFrame)cancelAnimationFrame(physicsFrame);
  physicsFrame=0;
  physicalBodies.forEach((body,el)=>{el.style.scale="";el.style.transformOrigin="";});
  physicalBodies.clear();physicsWorld=null;
}
function renderButtonPhysics(){
  if(!editMode||!physicsWorld)return;
  physicsWorld.step(1/60);
  for(const [el,body] of physicalBodies){
    const origin=body.__origin,base=body.__base,c=body.compression||0;
    el.style.translate=(base.x+body.x-origin.x)+"px "+(base.y+body.y-origin.y)+"px";
    el.style.scale=body.compressionAxis==="x"?(1-c)+" "+(1+c*.55):(1+c*.55)+" "+(1-c);
  }
  physicsFrame=requestAnimationFrame(renderButtonPhysics);
}
function ensurePhysicsTestButtons(){
  let panel=$("#veyrost-physics-test-panel");
  if(!panel){
    panel=document.createElement("div");
    panel.id="veyrost-physics-test-panel";
    panel.className="veyrost-physics-test-panel";
    panel.setAttribute("aria-label","Physics test controls");
    panel.innerHTML='<span class="physics-test-label">PHYSICS TEST</span><button type="button" data-physics-test="light">LIGHT · 0.6</button><button type="button" data-physics-test="standard">STANDARD · 1.0</button><button type="button" data-physics-test="heavy">HEAVY · 2.4</button><button type="button" data-physics-test="spring">SPRING · 0.8</button>';
    document.body.append(panel);
  }
  panel.hidden=!editMode;
}
function initButtonPhysics(){
  clearButtonPhysics();
  ensurePhysicsTestButtons();
  if(!window.VEYROST_MATTER?.MatterWorld)return;
  physicsWorld=new window.VEYROST_MATTER.MatterWorld(window.innerWidth,window.innerHeight,{gravity:0,positionCorrection:.9});
  const buttons=$("button:not(#layout-toggle):not(#aura-toggle):not(.menu-repair-button):not([disabled])");
  buttons.forEach((el,index)=>{
    const rect=el.getBoundingClientRect(),base=offset(el);
    const body=physicsWorld.add({id:el.id||el.dataset.layoutId||("ui-button-"+index),x:rect.left,y:rect.top,width:rect.width,height:rect.height,mass:el.dataset.physicsTest==="light"?.6:el.dataset.physicsTest==="heavy"?2.4:el.dataset.physicsTest==="spring"?.8:el.id==="menu-toggle"?2.4:1,elasticity:el.dataset.physicsTest==="spring"?.82:.24,friction:.42,maxCompression:.16,material:"soft-rubber"});
    body.__origin={x:rect.left,y:rect.top};body.__base=base;
    physicalBodies.set(el,body);el.style.transformOrigin="center";
  });
  physicsFrame=requestAnimationFrame(renderButtonPhysics);
}
const editHint=$("#edit-hint");
const cursor=$("#aura-pointer");

const twoStepArmed=new WeakSet();
const menuRepairNotice=document.createElement("aside");
menuRepairNotice.id="menu-repair-notice";
menuRepairNotice.className="menu-repair-notice";
menuRepairNotice.hidden=true;
menuRepairNotice.setAttribute("role","alert");
menuRepairNotice.setAttribute("aria-live","assertive");
const menuRepairText=document.createElement("span");
menuRepairText.className="menu-repair-message";
const menuRepairButton=document.createElement("button");
menuRepairButton.type="button";
menuRepairButton.className="menu-repair-button";
menuRepairNotice.append(menuRepairText,menuRepairButton);
document.body.append(menuRepairNotice);
function menuIsDetached(){
  if(!menu)return false;
  const raw=(menu.style.translate||"").trim();
  if(!raw||raw==="none")return false;
  const parts=raw.split(/\s+/);
  const x=Number.parseFloat(parts[0])||0;
  const y=Number.parseFloat(parts[1])||0;
  return Math.abs(x)>2||Math.abs(y)>2;
}
function updateMenuRepairNotice(){
  if(!menu)return;
  const detached=menuIsDetached();
  menu.dataset.detached=String(detached);
  menuRepairNotice.hidden=!detached;
  menu.setAttribute("aria-disabled",String(detached));
  menu.setAttribute("tabindex",detached?"-1":"0");
  menu.setAttribute("aria-expanded","false");
  if(detached)mobile?.classList.remove("open");
  const t=translations[language]||translations.en;
  menuRepairText.textContent=t.menuRisk;
  menuRepairButton.textContent=t.repairMenu;
  document.documentElement.classList.toggle("veyrost-menu-detached",detached);
}
let menuRepairing=false;
menuRepairButton.addEventListener("click",()=>{
  if(!menu||menuRepairing||!menuIsDetached())return;
  menuRepairing=true;
  menuRepairButton.disabled=true;
  menuRepairNotice.classList.add("is-repairing");
  const rect=menu.getBoundingClientRect();
  const delta=offset(menu);
  const homeX=rect.left-delta.x+rect.width/2-36;
  const homeY=rect.top-delta.y+rect.height/2-42;
  const overlay=document.createElement("div");
  overlay.className="veyrost-repair-layer";
  overlay.setAttribute("aria-hidden","true");
  const robot=document.createElement("div");
  robot.className="veyrost-repair-robot";
  robot.innerHTML='<svg viewBox="0 0 72 84" xmlns="http://www.w3.org/2000/svg"><path d="M36 8V3" stroke="#9DEBFF" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="3" r="3" fill="#9DEBFF"/><rect x="13" y="12" width="46" height="36" rx="12" fill="#B9B4FF" stroke="#F0EEFF" stroke-width="2"/><rect x="19" y="20" width="34" height="20" rx="7" fill="#111827"/><circle cx="28" cy="30" r="3.5" fill="#6FE6D0"/><circle cx="44" cy="30" r="3.5" fill="#6FE6D0"/><path d="M29 37Q36 41 43 37" fill="none" stroke="#6FE6D0" stroke-width="2" stroke-linecap="round"/><path d="M13 25H7V39H13M59 25H65V39H59" fill="none" stroke="#9DEBFF" stroke-width="3" stroke-linecap="round"/><rect x="23" y="50" width="26" height="19" rx="6" fill="#8D88D8"/><path class="robot-arm robot-arm-left" d="M23 54L12 65L19 70" fill="none" stroke="#B9B4FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="robot-arm robot-arm-right" d="M49 54L60 65L53 70" fill="none" stroke="#B9B4FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M29 69L25 80M43 69L47 80" stroke="#9DEBFF" stroke-width="5" stroke-linecap="round"/></svg><span>VEYROST • REPAIR UNIT</span>';
  overlay.append(robot);
  document.documentElement.append(overlay);
  const startX=Math.max(8,Math.min(window.innerWidth-80,window.innerWidth/2-36));
  const startY=Math.max(80,window.innerHeight-170);
  const approach=1450,repair=1450,finish=800;
  robot.style.left=startX+"px";
  robot.style.top=startY+"px";
  robot.style.opacity="1";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    robot.style.left=(rect.left+rect.width/2-36)+"px";
    robot.style.top=(rect.top+rect.height/2-42)+"px";
  }));
  window.setTimeout(()=>{
    robot.classList.add("is-working");
    menu.style.transition="translate 1350ms cubic-bezier(.2,.8,.2,1)";
    menu.style.translate="0px 0px";
    robot.style.left=homeX+"px";
    robot.style.top=homeY+"px";
    robot.classList.add("is-lifting");
  },approach);
  window.setTimeout(()=>{
    menu.style.transition="";
    menu.dataset.detached="false";
    updateMenuRepairNotice();
    robot.classList.add("is-leaving");
    robot.style.left=(window.innerWidth+90)+"px";
    robot.style.top=Math.max(10,homeY-90)+"px";
  },approach+repair);
  window.setTimeout(()=>{
    overlay.remove();
    menuRepairing=false;
    menuRepairButton.disabled=false;
    menuRepairNotice.classList.remove("is-repairing");
    toast((translations[language]||translations.en).menuRestored);
  },approach+repair+finish);
});

function offset(el){
  const a=(el.style.translate||"0px 0px").split(/\s+/);
  return {x:Number.parseFloat(a[0])||0,y:Number.parseFloat(a[1])||0};
}
function startDrag(x,y,source){
  if(!editMode||drag)return false;
  const hit=document.elementFromPoint(x,y),button=hit?.closest?.("button");
  const el=button&&physicalBodies.has(button)?button:hit?.closest?.("[data-veyrost-layout-item]");
  if(!el)return false;
  const p=offset(el),body=physicalBodies.get(el);
  if(body&&!physicsWorld.beginDrag(body.id,x,y))return false;
  drag={el,body,source,startX:x,startY:y,baseX:p.x,baseY:p.y,moved:false,lastX:x,lastY:y,lastTime:performance.now(),vx:0,vy:0};
  return true;
}
function moveDrag(x,y,source){
  if(!drag||drag.source!==source)return;
  const dx=x-drag.startX,dy=y-drag.startY;
  if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.body&&physicsWorld){
    const now=performance.now(),dt=Math.max(.008,(now-drag.lastTime)/1000);
    drag.vx=(x-drag.lastX)/dt;drag.vy=(y-drag.lastY)/dt;
    drag.lastX=x;drag.lastY=y;drag.lastTime=now;physicsWorld.dragTo(x,y);
  }else drag.el.style.translate=(drag.baseX+dx)+"px "+(drag.baseY+dy)+"px";
}
function finishDrag(){
  if(!drag)return;
  const moved=drag.moved,movedElement=drag.el;
  if(drag.body&&physicsWorld)physicsWorld.endDrag(drag.vx,drag.vy);
  drag=null;
  if(moved)savePositions();
  if(movedElement===menu&&moved){menu.setAttribute("aria-expanded","false");mobile?.classList.remove("open");}
  updateMenuRepairNotice();
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
  const physicsPanel=$("#veyrost-physics-test-panel");if(physicsPanel)physicsPanel.hidden=!editMode;
  if(editMode)initButtonPhysics();
  else {finishDrag();clearButtonPhysics();}
}
editButton?.addEventListener("click",()=>setEditMode(!editMode));
document.addEventListener("pointerdown",event=>{
  if(!editMode||event.button!==0)return;
  if(event.target?.closest?.("#layout-toggle"))return;
  const physicalButton=event.target?.closest?.("button");
  const target=physicalButton&&physicalBodies.has(physicalButton)?physicalButton:event.target?.closest?.("[data-veyrost-layout-item]");
  if(!target)return;
  if(target===menu&&!menuIsDetached()&&!twoStepArmed.has(target)){
    twoStepArmed.add(target);
    event.preventDefault();event.stopImmediatePropagation();
    toast("Locked for the first attempt. Drag again to move this control.");
    return;
  }
  // Menu requires two attempts only while it is still at its original position; after its first detach, all later drags use one attempt.
  event.preventDefault();event.stopImmediatePropagation();
  startDrag(event.clientX,event.clientY,"pointer");
});
document.addEventListener("pointermove",event=>moveDrag(event.clientX,event.clientY,"pointer"));
document.addEventListener("pointerup",()=>{if(drag?.source==="pointer")finishDrag()});
document.addEventListener("pointercancel",()=>{if(drag?.source==="pointer")finishDrag()});
document.addEventListener("click",event=>{
  const menuTarget=event.target?.closest?.("#menu-toggle");
  if(menuTarget&&(menuTarget.dataset.detached==="true"||editMode)){
    event.preventDefault();event.stopImmediatePropagation();return;
  }
  const physicalButton=event.target?.closest?.("button");
  if(editMode&&((physicalButton&&physicalBodies.has(physicalButton))||event.target?.closest?.("[data-veyrost-layout-item]"))){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);
restorePositions();
updateMenuRepairNotice();

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
