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
    const el=document.createElement("div");el.className="veyrost-repair-robot veyrost-tech-person";
    el.innerHTML='<svg viewBox="0 0 100 116" aria-hidden="true"><path d="M50 4v8" stroke="'+accent+'" stroke-width="3"/><circle cx="50" cy="4" r="3" fill="'+accent+'"/><path d="M25 32Q23 13 50 13Q77 13 75 32L70 40H30Z" fill="#d5d9e8" stroke="#f7fbff" stroke-width="2"/><path d="M25 31Q50 20 75 31L73 42H27Z" fill="#263d54" stroke="'+accent+'" stroke-width="2"/><rect x="29" y="34" width="42" height="25" rx="8" fill="#101a2b" stroke="'+accent+'" stroke-width="2"/><circle cx="41" cy="46" r="3" fill="'+accent+'"/><circle cx="59" cy="46" r="3" fill="'+accent+'"/><path d="M35 61L28 68L31 87H69L72 68L65 61Z" fill="#6675a8" stroke="#c6d1ec" stroke-width="2"/><path d="M36 64H64L61 80H39Z" fill="#253b50" stroke="'+accent+'" stroke-width="2"/><path d="M43 66v12M57 66v12" stroke="#d5e8f7" stroke-width="2"/><path d="M31 66L18 79L23 88M69 66L82 78L87 68" fill="none" stroke="#c6d1ec" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="89" r="4" fill="'+accent+'"/><path d="M83 62L91 66L87 74" fill="none" stroke="'+accent+'" stroke-width="3"/><path d="M43 90L39 106H48L50 94L52 106H61L57 90" fill="#6876a8" stroke="#d1d9eb" stroke-width="2"/></svg><span>TECH '+number+'</span>';
    return el;
  };
  const techA=makeTechnician("01","#6FE6D0"),techB=makeTechnician("02","#9DEBFF");
  const carried=menu.cloneNode(true);carried.removeAttribute("id");carried.classList.add("veyrost-carried-menu");
  carried.setAttribute("aria-hidden","true");carried.tabIndex=-1;
  Object.assign(carried.style,{position:"fixed",left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px",margin:"0",zIndex:"2147483647",pointerEvents:"none",translate:"none",transform:"none",transition:"left 1450ms cubic-bezier(.2,.75,.2,1),top 1450ms cubic-bezier(.2,.75,.2,1),opacity 250ms ease"});
  overlay.append(vehicle,techA,techB,carried);document.documentElement.append(overlay);
  const vw=window.innerWidth,vh=window.innerHeight,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const vehicleWidth=220,vehicleHeight=100,robotWidth=58,robotHeight=68;
  const lineY=clamp(rect.top+rect.height/2-vehicleHeight/2,12,Math.max(12,vh-vehicleHeight-12));
  // The service vehicle enters from the right on the same horizontal level as the detached MENU.
  const vehicleX=clamp(rect.right+14,8,Math.max(8,vw-vehicleWidth-8));
  const startVehicleX=vw+vehicleWidth+24;
  const doorX=vehicleX+18;
  const robotStartY=lineY+vehicleHeight-robotHeight-2;
  const robotAX=clamp(rect.left-robotWidth-8,4,Math.max(4,vw-robotWidth-4));
  const robotBX=clamp(rect.right+8,4,Math.max(4,vw-robotWidth-4));
  const robotAY=clamp(rect.top+rect.height/2-robotHeight/2,4,Math.max(4,vh-robotHeight-4));
  const robotBY=robotAY;
  vehicle.style.left=startVehicleX+"px";vehicle.style.top=lineY+"px";
  for(const [el,x] of [[techA,doorX+22],[techB,doorX+92]]){el.style.left=x+"px";el.style.top=robotStartY+"px";el.style.opacity="0";}
  const move=(el,x,y)=>{el.style.left=x+"px";el.style.top=y+"px";};
  try{
    await wait(80);
    vehicle.style.left=vehicleX+"px";
    await wait(1580);
    vehicle.classList.add("is-parked");
    // Technicians emerge from the vehicle's near-side service door, never from a screen corner.
    techA.style.opacity="1";techB.style.opacity="1";
    move(techA,doorX+16,robotStartY);move(techB,doorX+84,robotStartY);
    await wait(260);
    techA.classList.add("is-walking");techB.classList.add("is-walking");
    move(techA,robotAX,robotAY);move(techB,robotBX,robotBY);
    await wait(780);
    techA.classList.remove("is-walking");techB.classList.remove("is-walking");
    // The original control is hidden while the visible duplicate is carried between both robots.
    menu.style.visibility="hidden";
    techA.classList.add("is-carrying");techB.classList.add("is-carrying");
    await wait(220);
    carried.style.left=targetX+"px";carried.style.top=targetY+"px";
    move(techA,clamp(targetX-robotWidth+8,4,vw-robotWidth-4),clamp(targetY+rect.height/2-robotHeight/2,4,vh-robotHeight-4));
    move(techB,clamp(targetX+rect.width-8,4,vw-robotWidth-4),clamp(targetY+rect.height/2-robotHeight/2,4,vh-robotHeight-4));
    await wait(1550);
    // At the original position, both technicians set the MENU down and visibly repair it.
    techA.classList.remove("is-carrying");techB.classList.remove("is-carrying");
    techA.classList.add("is-working");techB.classList.add("is-working");
    const repairFx=document.createElement("div");repairFx.className="veyrost-menu-repair-fx";
    repairFx.innerHTML='<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M19 22l10 10-8 8-10-10a14 14 0 0018 18l28 28 9-9-28-28a14 14 0 00-19-17zM91 8l-8 8 7 7-18 18 7 7 18-18 7 7 8-8-21-21z" fill="none" stroke="#8ff4e4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 4v12M44 11l7 8M76 11l-7 8M60 66v15M47 70l-7 8M73 70l7 8" stroke="#d7fbff" stroke-width="3" stroke-linecap="round"/></svg><span>SYSTEM REPAIR</span>';
    const carriedRect=carried.getBoundingClientRect();
    Object.assign(repairFx.style,{position:"fixed",left:(carriedRect.left+carriedRect.width/2-60)+"px",top:(carriedRect.top-48)+"px",width:"120px",height:"90px",zIndex:"2147483647",pointerEvents:"none"});
    overlay.append(repairFx);carried.classList.add("is-being-repaired");
    await wait(1750);
    repairFx.classList.add("is-complete");
    await wait(500);
    // Reveal the real MENU only after the repair sequence is complete.
    menu.style.transition="none";menu.style.translate="0px 0px";menu.style.visibility="";
    menu.dataset.detached="false";updateMenuRepairNotice();
    carried.style.opacity="0";
    await wait(260);
    techA.classList.remove("is-working");techB.classList.remove("is-working");
    techA.classList.add("is-walking");techB.classList.add("is-walking");
    move(techA,doorX+16,robotStartY);move(techB,doorX+84,robotStartY);
    await wait(760);
    // Board the service vehicle: each technician disappears behind its side panel before departure.
    techA.classList.add("is-boarding");techB.classList.add("is-boarding");
    await wait(340);
    techA.style.opacity="0";techB.style.opacity="0";
    await wait(420);
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
