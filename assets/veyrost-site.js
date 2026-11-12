import "../matter-engine.js?v=20261112-2";
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
 en:{move:"MOVE ITEMS",done:"FINISH EDIT",auraOn:"AURA ON",auraOff:"AURA OFF",testTitle:"BUTTON LAB",testState:"STATE: OFF",testCount:"COUNT: 0",testPing:"PING",testReset:"RESET",testActive:"STATE: ON",testPinged:"SIGNAL SENT",editHint:"Layout editing is active. Drag cards or categories to rearrange them.",saved:"Workspace arrangement saved.",menuRisk:"MENU DETACHED · SYSTEM RISK",repairMenu:"REPAIR MENU",menuRestored:"Menu button restored to its original position."},
 ru:{move:"ПЕРЕМЕСТИТЬ БЛОКИ",done:"ЗАВЕРШИТЬ РЕДАКТИРОВАНИЕ",auraOn:"AURA ВКЛ",auraOff:"AURA ВЫКЛ",testTitle:"ТЕСТ КНОПОК",testState:"СОСТОЯНИЕ: ВЫКЛ",testCount:"СЧЁТ: 0",testPing:"СИГНАЛ",testReset:"СБРОС",testActive:"СОСТОЯНИЕ: ВКЛ",testPinged:"СИГНАЛ ОТПРАВЛЕН",editHint:"Режим редактирования активен. Перетаскивайте карточки и категории.",saved:"Расположение сохранено.",menuRisk:"КНОПКА МЕНЮ СМЕЩЕНА · РИСК СИСТЕМЫ",repairMenu:"ВОССТАНОВИТЬ МЕНЮ",menuRestored:"Кнопка меню возвращена на исходное место."},
 tj:{move:"ҶОЙИВАЗКУНИИ ҚИСМҲО",done:"АНҶОМИ ТАҲРИР",auraOn:"AURA ФАЪОЛ",auraOff:"AURA ХОМӮШ",testTitle:"САНҶИШИ ТУГМАҲО",testState:"ҲОЛАТ: ХОМӮШ",testCount:"ШУМОР: 0",testPing:"СИГНАЛ",testReset:"АЗ НАВ",testActive:"ҲОЛАТ: ФАЪОЛ",testPinged:"СИГНАЛ ФИРИСТОДА ШУД",editHint:"Реҷаи таҳрир фаъол аст. Кортҳо ва гурӯҳҳоро ҷойиваз кунед.",saved:"Тарҳ нигоҳ дошта шуд.",menuRisk:"ТУГМАИ МЕНЮ ҶОЙИ ХУДРО ТАРК КАРД · ХАТАРИ СИСТЕМАВӢ",repairMenu:"МЕНЮРО ДУРУСТ КУН",menuRestored:"Тугмаи меню ба ҷойи аслиаш баргашт."}
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
  physicalBodies.forEach((body,el)=>{el.style.scale="";el.style.transformOrigin="";el.style.clipPath="";el.style.translate="";});
  physicalBodies.clear();physicsWorld=null;
}
function renderButtonPhysics(){
  if(!editMode||!physicsWorld)return;
  physicsWorld.step(1/60);
  for(const [el,body] of physicalBodies){
    const origin=body.__origin,base=body.__base;
    el.style.translate=(base.x+body.x-origin.x)+"px "+(base.y+body.y-origin.y)+"px";
    const d=body.deformation||{top:0,right:0,bottom:0,left:0},at=body.deformationAt||{top:.5,right:.5,bottom:.5,left:.5};
    const depth=(side,factor=1)=>Math.max(0,Math.min(12,(d[side]||0)*100*factor));
    const pct=v=>v.toFixed(2)+"%";
    const t=(at.top||.5)*100,rr=(at.right||.5)*100,b=(at.bottom||.5)*100,l=(at.left||.5)*100;
    const td=depth("top"),rd=depth("right"),bd=depth("bottom"),ld=depth("left");
    const points=[
      [0,0],[t-18,td*.35],[t,td],[t+18,td*.35],[100,0],
      [100,rr-18],[100-rd,rr],[100,rr+18],
      [100,100],[b+18,100-bd*.35],[b,100-bd],[b-18,100-bd*.35],[0,100],
      [ld*.35,l+18],[ld,l],[ld*.35,l-18]
    ];
    const poly=points.map(([x,y])=>pct(Math.max(0,Math.min(100,x)))+" "+pct(Math.max(0,Math.min(100,y))));    el.style.clipPath="polygon("+poly.join(",")+")";
  }
  physicsFrame=requestAnimationFrame(renderButtonPhysics);
}
function initButtonPhysics(){
  clearButtonPhysics();
  if(!window.VEYROST_MATTER?.MatterWorld)return;
  const pageWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth,window.innerWidth);
  const pageHeight=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,window.innerHeight);
  physicsWorld=new window.VEYROST_MATTER.MatterWorld(pageWidth,pageHeight,{gravity:0,positionCorrection:.9});
  const catalogs=movable().filter(el=>!el.matches("#layout-toggle,#aura-toggle,#menu-toggle,.menu-repair-button,[disabled]"));
  catalogs.forEach((el,index)=>{
    const rect=el.getBoundingClientRect(),base=offset(el);
    const area=rect.width*rect.height;
    const mass=Math.max(.8,Math.min(4,area/18000));
    const docX=rect.left+window.scrollX,docY=rect.top+window.scrollY;
    const body=physicsWorld.add({id:el.id||el.dataset.layoutId||("catalog-body-"+index),x:docX,y:docY,width:rect.width,height:rect.height,mass,elasticity:.08,friction:.62,maxCompression:.08,material:"soft-rubber"});
    body.__origin={x:docX,y:docY};body.__base=base;
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
let detachedMenuState=false;
function menuIsDetached(){return Boolean(menu&&detachedMenuState);}
let detachedMenuWires=null;
let menuHomePosition=null;
function captureMenuHomePosition(){
  if(!menu)return;
  const rect=menu.getBoundingClientRect();
  menuHomePosition={left:rect.left+window.scrollX,top:rect.top+window.scrollY,width:rect.width,height:rect.height};
}
function syncDetachedMenuWires(detached){
  if(!menu)return;
  if(!detached){
    detachedMenuWires?.remove();detachedMenuWires=null;return;
  }
  // Keep the severed cable at the button's authored home position, never derive it
  // from the detached button's current position or its transform.
  if(!menuHomePosition)return;
  const x=menuHomePosition.left-window.scrollX;
  const y=menuHomePosition.top-window.scrollY;
  if(!detachedMenuWires){
    detachedMenuWires=document.createElement("div");
    detachedMenuWires.className="veyrost-detached-wires";
    detachedMenuWires.setAttribute("aria-hidden","true");
    detachedMenuWires.innerHTML='<svg viewBox="0 0 176 112" focusable="false" role="presentation"><defs><radialGradient id="wall-break-depth" cx="45%" cy="42%" r="65%"><stop stop-color="#020408"/><stop offset=".72" stop-color="#070b11"/><stop offset="1" stop-color="#121a24"/></radialGradient><linearGradient id="wall-break-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#aab0b8" stop-opacity=".72"/><stop offset=".48" stop-color="#525d68" stop-opacity=".8"/><stop offset="1" stop-color="#202a35" stop-opacity=".95"/></linearGradient><linearGradient id="cable-jacket" x1="0" y1="0" x2="1" y2=".18"><stop offset="0" stop-color="#030609"/><stop offset=".38" stop-color="#151e27"/><stop offset=".72" stop-color="#394650"/><stop offset="1" stop-color="#82909a"/></linearGradient><linearGradient id="wire-gold" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#24190e"/><stop offset=".55" stop-color="#916a37"/><stop offset="1" stop-color="#e2b875"/></linearGradient><linearGradient id="wire-teal" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0c1a1b"/><stop offset=".55" stop-color="#287b78"/><stop offset="1" stop-color="#8bd8ca"/></linearGradient><linearGradient id="wire-red" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#211311"/><stop offset=".55" stop-color="#895044"/><stop offset="1" stop-color="#e0a08a"/></linearGradient><linearGradient id="wire-blue" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#101924"/><stop offset=".55" stop-color="#456b91"/><stop offset="1" stop-color="#9bb9d4"/></linearGradient><linearGradient id="wire-ivory" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#211d17"/><stop offset=".55" stop-color="#9a8a69"/><stop offset="1" stop-color="#e3d0a6"/></linearGradient><linearGradient id="wire-violet" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#1a1423"/><stop offset=".55" stop-color="#68518c"/><stop offset="1" stop-color="#b6a2df"/></linearGradient><linearGradient id="wire-copper" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#28160e"/><stop offset=".55" stop-color="#9d5e35"/><stop offset="1" stop-color="#e3a16b"/></linearGradient><filter id="wall-break-shadow" x="-35%" y="-40%" width="180%" height="190%"><feGaussianBlur stdDeviation="2.6"/></filter></defs><path d="M18 20l11-8 14 4 9-7 14 5 10-6 13 9 11-2 8 10-5 12 7 10-9 9-13 1-8 10-14-4-10 7-13-7-12 3-7-10-12-4 5-12-7-10z" fill="#000" opacity=".72" filter="url(#wall-break-shadow)"/><path d="M20 20l10-7 13 4 10-7 13 5 10-6 12 8 11-2 8 10-5 11 7 10-9 9-12 1-8 9-13-4-10 7-12-7-12 3-7-10-11-4 4-12-7-9z" fill="url(#wall-break-depth)" stroke="url(#wall-break-edge)" stroke-width="2.2" stroke-linejoin="bevel"/><path d="M28 20l9-3 7 4 10-5 9 5 9-4 11 7 9-1 5 8-4 8 5 8-9 5-9-2-8 7-10-4-8 5-9-6-10 2-4-8-8-3 4-9-5-7z" fill="#020509" opacity=".99"/><path d="M22 19l-9-7m16 2l-3-9m36 8l5-9m30 20l10-5m-8 34l11 7m-36 8l-3 10m-32-9l-9 8m-7-34l-10 2" fill="none" stroke="#87919b" stroke-opacity=".62" stroke-width="1.4" stroke-linecap="round"/><g class="wire wire-a"><path d="M52 43C43 37 35 29 22 20" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M52 43C43 37 35 29 22 20" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M52 43C43 37 35 29 22 20" fill="none" stroke="url(#wire-gold)" stroke-width="1.35" stroke-linecap="round"/><path d="M22 20l-5-1m5 1l-2-5" stroke="#d8a46b" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="wire wire-b"><path d="M55 42C53 31 57 20 56 7" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M55 42C53 31 57 20 56 7" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M55 42C53 31 57 20 56 7" fill="none" stroke="url(#wire-ivory)" stroke-width="1.35" stroke-linecap="round"/><path d="M56 7l-3-4m3 4l3-4" stroke="#d9b17b" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="wire wire-c"><path d="M59 42C69 33 81 25 96 17" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M59 42C69 33 81 25 96 17" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M59 42C69 33 81 25 96 17" fill="none" stroke="url(#wire-violet)" stroke-width="1.35" stroke-linecap="round"/><path d="M96 17l5-1m-5 1l2-5" stroke="#c0a8dc" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="wire wire-d"><path d="M61 46C82 44 107 48 139 44" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M61 46C82 44 107 48 139 44" fill="none" stroke="url(#cable-jacket)" stroke-width="5.4" stroke-linecap="round"/><path d="M61 46C82 44 107 48 139 44" fill="none" stroke="url(#wire-red)" stroke-width="1.45" stroke-linecap="round"/><path d="M139 44l5-3m-5 3l5 3" stroke="#e1a07e" stroke-width="1.05" fill="none" stroke-linecap="round"/></g><g class="wire wire-e"><path d="M59 50C72 61 85 72 99 84" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M59 50C72 61 85 72 99 84" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M59 50C72 61 85 72 99 84" fill="none" stroke="url(#wire-blue)" stroke-width="1.35" stroke-linecap="round"/><path d="M99 84l5 1m-5-1l2 5" stroke="#9dbbd4" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="wire wire-f"><path d="M55 51C53 65 57 81 57 99" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M55 51C53 65 57 81 57 99" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M55 51C53 65 57 81 57 99" fill="none" stroke="url(#wire-teal)" stroke-width="1.4" stroke-linecap="round"/><path d="M57 99l-3 4m3-4l3 4" stroke="#8bd8ca" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="wire wire-g"><path d="M51 49C40 60 29 72 17 85" fill="none" stroke="#000" stroke-width="8" opacity=".8" filter="url(#wall-break-shadow)"/><path d="M51 49C40 60 29 72 17 85" fill="none" stroke="url(#cable-jacket)" stroke-width="5.2" stroke-linecap="round"/><path d="M51 49C40 60 29 72 17 85" fill="none" stroke="url(#wire-copper)" stroke-width="1.35" stroke-linecap="round"/><path d="M17 85l-5 1m5-1l-2 5" stroke="#d99a67" stroke-width="1" fill="none" stroke-linecap="round"/></g></svg>';
    (menu.closest(".site-header")||document.body).append(detachedMenuWires);
  }
  // Size the break to the real MENU footprint; keep the aperture centered on its home position.
  // The aperture spans roughly x=20..110 and y=7..76 in the 176x112 SVG viewBox.
  const holeScale=0.90;
  const wireWidth=menuHomePosition.width*(176/90)*holeScale;
  const wireHeight=menuHomePosition.height*(112/69)*holeScale;
  const apertureCenterX=65/176*wireWidth;
  const apertureCenterY=42/112*wireHeight;
  detachedMenuWires.style.width=wireWidth+"px";
  detachedMenuWires.style.height=wireHeight+"px";
  detachedMenuWires.style.left=(x+menuHomePosition.width/2-apertureCenterX)+"px";
  detachedMenuWires.style.top=(y+menuHomePosition.height/2-apertureCenterY)+"px";
}
function updateMenuRepairNotice(){
  if(!menu)return;
  const detached=menuIsDetached();
  syncDetachedMenuWires(detached);
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
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const moveTo = (el,x,y,walking=false) => {
  el.classList.toggle("is-walking",walking);
  el.style.left=x+"px"; el.style.top=y+"px";
};
menuRepairButton.addEventListener("click",async()=>{
  if(!menu||menuRepairing||!menuIsDetached())return;
  menuRepairing=true;menuRepairButton.disabled=true;menuRepairNotice.classList.add("is-repairing");
  const rect=menu.getBoundingClientRect();
  const translateParts=(menu.style.translate||"0px 0px").trim().split(/\s+/);
  const deltaX=Number.parseFloat(translateParts[0])||0;
  const deltaY=Number.parseFloat(translateParts[1])||0;
  const targetX=rect.left-deltaX,targetY=rect.top-deltaY;
  const overlay=document.createElement("div");overlay.className="veyrost-repair-layer";overlay.setAttribute("aria-hidden","true");
  const vehicle=document.createElement("div");vehicle.className="veyrost-tech-vehicle";
  vehicle.innerHTML='<svg viewBox="0 0 220 100" aria-hidden="true"><path d="M16 58h126l24-29h26l15 29h7v20H16z" fill="#17263a" stroke="#7de6ed" stroke-width="2"/><path d="M145 57l22-24h22l12 24z" fill="#233d54" stroke="#9defff" stroke-width="2"/><path d="M20 64h186" stroke="#a9b8d2" stroke-width="3"/><rect x="28" y="38" width="76" height="22" rx="5" fill="#26354c" stroke="#9b91ff" stroke-width="2"/><path d="M39 49h53M39 55h33" stroke="#8de8ed" stroke-width="2"/><circle cx="52" cy="80" r="13" fill="#080d17" stroke="#9da9c1" stroke-width="4"/><circle cx="52" cy="80" r="4" fill="#70e7df"/><circle cx="176" cy="80" r="13" fill="#080d17" stroke="#9da9c1" stroke-width="4"/><circle cx="176" cy="80" r="4" fill="#70e7df"/><path d="M4 65h12M207 65h10" stroke="#6fe6d0" stroke-width="4" stroke-linecap="round"/></svg><span>VEYROST SERVICE UNIT</span>';
  const makeTechnician=(number,accent)=>{
    const el=document.createElement("div");el.className="veyrost-tech-person";
    el.innerHTML='<svg viewBox="0 0 100 116" aria-hidden="true"><defs><linearGradient id="robot-metal-'+number+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e0e8ef"/><stop offset=".42" stop-color="#778797"/><stop offset="1" stop-color="#273441"/></linearGradient><linearGradient id="robot-dark-'+number+'" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#263746"/><stop offset="1" stop-color="#0b121a"/></linearGradient></defs><path d="M50 2v9M50 8l-7-5m7 5l7-5" stroke="'+accent+'" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="3" r="2.4" fill="'+accent+'"/><path d="M32 25L35 15L43 11H57L65 15L68 25L63 32H37Z" fill="url(#robot-metal-'+number+')" stroke="#dce7ef" stroke-width="1.8"/><path d="M35 24L41 19H59L65 24L62 30H38Z" fill="url(#robot-dark-'+number+')" stroke="'+accent+'" stroke-width="1.7"/><rect x="41" y="22" width="7" height="4" rx="1.5" fill="'+accent+'"/><rect x="52" y="22" width="7" height="4" rx="1.5" fill="'+accent+'"/><path d="M50 31v5m-4-1h8" stroke="#dce7ef" stroke-width="2" stroke-linecap="round"/><path d="M38 37L31 42L33 62L41 69H59L67 62L69 42L62 37Z" fill="url(#robot-dark-'+number+')" stroke="#aebdca" stroke-width="1.8"/><path d="M39 40L50 36L61 40L59 48H41Z" fill="url(#robot-metal-'+number+')" stroke="'+accent+'" stroke-width="1.7"/><path d="M43 51H57L61 62L50 67L39 62Z" fill="#111d28" stroke="'+accent+'" stroke-width="1.5"/><path d="M46 53v8m8-8v8M50 39v7" stroke="'+accent+'" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="57" r="2.5" fill="'+accent+'"/><path d="M32 42L24 47L19 62L24 65L32 55M68 42L76 47L81 62L76 65L68 55" fill="none" stroke="url(#robot-metal-'+number+')" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="64" r="5" fill="#172532" stroke="'+accent+'" stroke-width="1.7"/><circle cx="78" cy="64" r="5" fill="#172532" stroke="'+accent+'" stroke-width="1.7"/><path d="M22 69l-4 8 5 5 8-9m47-4l4 8-5 5-8-9" fill="none" stroke="#aebdca" stroke-width="4" stroke-linecap="round"/><path d="M42 68L38 75L40 88H47L50 77L53 88H60L62 75L58 68Z" fill="url(#robot-metal-'+number+')" stroke="#dce7ef" stroke-width="1.7"/><path d="M40 76H47L45 84H40ZM53 76H60L60 84H55Z" fill="#101a24" stroke="'+accent+'" stroke-width="1.2"/><path d="M42 89L38 101L43 105L49 91M58 89L62 101L57 105L51 91" fill="none" stroke="url(#robot-metal-'+number+')" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 105h9m8 0h9" stroke="'+accent+'" stroke-width="2.5" stroke-linecap="round"/><path d="M34 45l-4 10m36-10l4 10" stroke="'+accent+'" stroke-width="1.3" opacity=".9"/><circle cx="50" cy="73" r="2" fill="'+accent+'"/></svg><span>UNIT '+number+'</span>';
    return el;
  };
  const techA=makeTechnician("01","#6FE6D0"),techB=makeTechnician("02","#A98CFF");
  const carried=menu.cloneNode(true);carried.removeAttribute("id");carried.classList.add("veyrost-carried-menu");
  carried.setAttribute("aria-hidden","true");carried.tabIndex=-1;
  Object.assign(carried.style,{position:"fixed",left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px",margin:"0",zIndex:"2147483647",pointerEvents:"none",translate:"none",transform:"none",transition:"left 1450ms cubic-bezier(.2,.75,.2,1),top 1450ms cubic-bezier(.2,.75,.2,1),opacity 250ms ease"});
  overlay.append(vehicle,techA,techB,carried);document.documentElement.append(overlay);
  const vw=window.innerWidth,vh=window.innerHeight,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const vehicleWidth=220,vehicleHeight=100,robotWidth=82,robotHeight=96;
  const lineY=clamp(rect.top+rect.height/2-vehicleHeight/2,12,Math.max(12,vh-vehicleHeight-12));
  // The service vehicle enters from the right on the same horizontal level as the detached MENU.
  const vehicleX=clamp(rect.right+14,8,Math.max(8,vw-vehicleWidth-8));
  const startVehicleX=vw+vehicleWidth+24;
  // Door anchors are measured from the parked vehicle's cabin, not the viewport edges.
  const robotSize=vw<=760?58:82;
  const doorAX=vehicleX+38,doorBX=vehicleX+124;
  const cabinY=lineY+7;
  const robotStartY=cabinY;
  const robotExitY=lineY+vehicleHeight-robotSize+8;
  const robotAX=clamp(rect.left-robotWidth-8,4,Math.max(4,vw-robotWidth-4));
  const robotBX=clamp(rect.right+8,4,Math.max(4,vw-robotWidth-4));
  const robotAY=clamp(rect.top+rect.height/2-robotHeight/2,4,Math.max(4,vh-robotHeight-4));
  const robotBY=robotAY;
  vehicle.style.left=startVehicleX+"px";vehicle.style.top=lineY+"px";
  for(const [el,x] of [[techA,doorAX],[techB,doorBX]]){
    Object.assign(el.style,{position:"fixed",left:x+"px",top:robotStartY+"px",right:"auto",bottom:"auto",width:robotSize+"px",height:"auto",margin:"0",transform:"none",translate:"none",opacity:"0",zIndex:"2147483647",pointerEvents:"none"});
  }
  const move=(el,x,y)=>{el.style.left=x+"px";el.style.top=y+"px";};
  try{
    await wait(80);
    vehicle.style.left=vehicleX+"px";
    await wait(1580);
    vehicle.classList.add("is-parked");
    // Technicians emerge from the vehicle's near-side service door, never from a screen corner.
    techA.style.opacity="1";techB.style.opacity="1";
    await wait(220);
    // Step out from the vehicle's near-side door before walking to the detached control.
    techA.classList.add("is-walking");techB.classList.add("is-walking");
    move(techA,doorAX-8,robotExitY);
    move(techB,doorBX-8,robotExitY);
    await wait(620);
    move(techA,robotAX,robotAY);move(techB,robotBX,robotBY);
    await wait(780);
    techA.classList.remove("is-walking");techB.classList.remove("is-walking");
    // Robot A physically carries MENU to its original mount; robot B independently reconnects the seven leads at the wall opening.
    menu.style.visibility="hidden";
    techA.classList.add("is-carrying");
    techB.classList.add("is-wiring");
    const homeX=(menuHomePosition?.left??(targetX+window.scrollX))-window.scrollX;
    const homeY=(menuHomePosition?.top??(targetY+window.scrollY))-window.scrollY;
    const wireRobotX=clamp(homeX+rect.width+12,4,vw-robotWidth-4);
    const wireRobotY=clamp(homeY+rect.height/2-robotHeight/2,4,vh-robotHeight-4);
    move(techB,wireRobotX,wireRobotY);
    await wait(180);
    carried.style.left=targetX+"px";carried.style.top=targetY+"px";
    move(techA,clamp(targetX-robotWidth+8,4,vw-robotWidth-4),clamp(targetY+rect.height/2-robotHeight/2,4,vh-robotHeight-4));
    await wait(1580);
    techA.classList.remove("is-carrying");
    techA.classList.add("is-working");
    const repairFx=document.createElement("div");repairFx.className="veyrost-menu-repair-fx";
    repairFx.innerHTML='<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M19 22l10 10-8 8-10-10a14 14 0 0018 18l28 28 9-9-28-28a14 14 0 00-19-17zM91 8l-8 8 7 7-18 18 7 7 18-18 7 7 8-8-21-21z" fill="none" stroke="#8ff4e4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 4v12M44 11l7 8M76 11l-7 8M60 66v15M47 70l-7 8M73 70l7 8" stroke="#d7fbff" stroke-width="3" stroke-linecap="round"/></svg><span>7 CABLES • RECONNECTED</span>';
    Object.assign(repairFx.style,{position:"fixed",left:(homeX+rect.width/2-60)+"px",top:(homeY+rect.height/2-45)+"px",width:"120px",height:"90px",zIndex:"2147483647",pointerEvents:"none"});
    overlay.append(repairFx);
    if(detachedMenuWires)detachedMenuWires.classList.add("is-reconnecting");
    await wait(1900);
    repairFx.classList.add("is-complete");
    await wait(500);
    techB.classList.remove("is-wiring");
    techB.classList.add("is-working");
    // Reveal the real MENU only after the repair sequence is complete.
    menu.style.transition="none";menu.style.translate="0px 0px";menu.style.visibility="";
    detachedMenuState=false;menu.dataset.detached="false";updateMenuRepairNotice();
    carried.style.opacity="0";
    await wait(260);
    techA.classList.remove("is-working");techB.classList.remove("is-working");
    techA.classList.add("is-walking");techB.classList.add("is-walking");
    // Return to the exact cabin anchors. The robots move fully inside the vehicle body.
    move(techA,doorAX,robotStartY);move(techB,doorBX,robotStartY);
    await wait(720);
    // Only after reaching the cabin do they board and disappear inside.
    techA.classList.add("is-boarding");techB.classList.add("is-boarding");
    await wait(460);
    techA.style.opacity="0";techB.style.opacity="0";
    await wait(520);
    vehicle.classList.add("is-driving-away");vehicle.style.left=startVehicleX+"px";
    await wait(1250);
    toast((translations[language]||translations.en).menuRestored);
  }catch(error){
    menu.style.visibility="";console.error("VEYROST repair animation:",error);
  }finally{
    overlay.remove();menu.style.visibility="";menu.style.transition="";menuRepairing=false;menuRepairButton.disabled=false;menuRepairNotice.classList.remove("is-repairing");
    if(menuIsDetached())updateMenuRepairNotice();else updateMenuRepairNotice();
  }
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
  const worldX=x+window.scrollX,worldY=y+window.scrollY;
  if(body&&!physicsWorld.beginDrag(body.id,worldX,worldY))return false;
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
    drag.lastX=x;drag.lastY=y;drag.lastTime=now;physicsWorld.dragTo(x+window.scrollX,y+window.scrollY);
  }else drag.el.style.translate=(drag.baseX+dx)+"px "+(drag.baseY+dy)+"px";
  // Reveal the wall opening on the very first movement that detaches MENU,
  // instead of waiting for pointerup after the drag ends.
  if(drag.el===menu&&drag.moved){detachedMenuState=true;updateMenuRepairNotice();}
}
function finishDrag(){
  if(!drag)return;
  const moved=drag.moved,movedElement=drag.el;
  if(drag.body&&physicsWorld)physicsWorld.endDrag(drag.vx,drag.vy);
  drag=null;
  if(moved)savePositions();
  if(movedElement===menu&&moved){
    // Once detached, MENU remains physically disconnected regardless of where it is released.
    // Only the technician repair sequence or a full page reload may restore it.
    detachedMenuState=true;
    menu.setAttribute("aria-expanded","false");mobile?.classList.remove("open");
  }
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
// Capture the authored MENU footprint after the initial layout has settled.
const captureInitialMenuHome=()=>{if(!menuIsDetached())captureMenuHomePosition();};
requestAnimationFrame(()=>requestAnimationFrame(captureInitialMenuHome));
if(document.fonts?.ready)document.fonts.ready.then(captureInitialMenuHome).catch(()=>{});
window.addEventListener("resize",()=>{if(!menuIsDetached())captureMenuHomePosition();},{passive:true});
// MENU lives in a sticky header: refresh its true home coordinates after page scrolling,
// so a first locked tap followed by scrolling cannot leave the wall opening off-screen.
window.addEventListener("scroll",()=>{if(!menuIsDetached())captureMenuHomePosition();},{passive:true});
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
