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

// Complete site localization: translate every rendered text node, not only navigation labels.
const dictionaries = {
en: {
"Overview":"Overview","Projects":"Projects","Workspace":"Workspace","Company":"Company","Research":"Research","Contact":"Contact",
"AURA OFF":"AURA OFF","AURA ON":"AURA ON","MOVE ITEMS":"MOVE ITEMS","FINISH EDIT":"FINISH EDIT",
"INDEPENDENT TECHNOLOGY INITIATIVE · TAJIKISTAN":"INDEPENDENT TECHNOLOGY INITIATIVE · TAJIKISTAN",
"ENGINEERING":"ENGINEERING","WHAT'S NEXT.":"WHAT'S NEXT.",
"VEYROST is an independent engineering ecosystem: focused products, applied research and software systems built around real problems. One platform connects every project, discipline and experiment.":"VEYROST is an independent engineering ecosystem: focused products, applied research and software systems built around real problems. One platform connects every project, discipline and experiment.",
"EXPLORE THE PORTFOLIO ↗":"EXPLORE THE PORTFOLIO ↗","OUR ENGINEERING MODEL":"OUR ENGINEERING MODEL","OPEN WORKSPACE":"OPEN WORKSPACE",
"Many systems. One engineering direction.":"Many systems. One engineering direction.","Core Platform":"Core Platform","Products & Platforms":"Products & Platforms","AI & Security":"AI & Security",
"Developer Systems":"Developer Systems","Creative Interfaces":"Creative Interfaces","Research & Prototyping":"Research & Prototyping",
"Focused products. Measurable purpose.":"Focused products. Measurable purpose.","PROJECTS":"PROJECTS","IN MOTION.":"IN MOTION.",
"Find a system by purpose.":"Find a system by purpose.","All":"All","Core platform":"Core platform","Platforms":"Platforms","Commerce":"Commerce",
"AI & security":"AI & security","AI & interaction":"AI & interaction","Developer tools":"Developer tools","Creative tools":"Creative tools",
"Data & research":"Data & research","Research & hardware":"Research & hardware","Experiments":"Experiments","Private systems":"Private systems",
"Public portfolio. Private work protected.":"Public portfolio. Private work protected.","COMPANY / ENGINEERING MODEL":"COMPANY / ENGINEERING MODEL",
"BUILT WITH":"BUILT WITH","ENGINEERING DISCIPLINE.":"ENGINEERING DISCIPLINE.","A connected engineering ecosystem.":"A connected engineering ecosystem.",
"MISSION":"MISSION","Turn ideas into useful systems.":"Turn ideas into useful systems.","OPERATING PRINCIPLE":"OPERATING PRINCIPLE",
"Evidence over appearance.":"Evidence over appearance.","Specialized roles. Shared standards.":"Specialized roles. Shared standards.",
"Product Strategy & Research":"Product Strategy & Research","Systems Architecture":"Systems Architecture","Experience & Interface":"Experience & Interface",
"AI & Automation":"AI & Automation","Security & Reliability":"Security & Reliability","Documentation & Release":"Documentation & Release",
"How work moves from idea to release.":"How work moves from idea to release.","Inspect source":"Inspect source","Define scope":"Define scope","Build & test":"Build & test","Deploy & verify":"Deploy & verify",
"CONTACT / COLLABORATION":"CONTACT / COLLABORATION","LET'S BUILD":"LET'S BUILD","SOMETHING USEFUL.":"SOMETHING USEFUL.",
"Start a conversation.":"Start a conversation.","Email":"Email","Telegram":"Telegram","GitHub":"GitHub",
"RESEARCH / APPLIED SYSTEMS":"RESEARCH / APPLIED SYSTEMS","UNDERSTAND.":"UNDERSTAND.","TEST. ENGINEER.":"TEST. ENGINEER.",
"Questions connected to real builds.":"Questions connected to real builds.","AI Agent Security":"AI Agent Security",
"Computer Vision & Interaction":"Computer Vision & Interaction","Network Diagnostics":"Network Diagnostics","Software Quality & Trust":"Software Quality & Trust",
"Structured Product Data":"Structured Product Data","Hardware & Prototyping Roadmap":"Hardware & Prototyping Roadmap",
"Research must be inspectable.":"Research must be inspectable.","Source-backed statements":"Source-backed statements","Release discipline":"Release discipline",
"Research continues in the repositories.":"Research continues in the repositories.","WORKSPACE / LAYOUT CONTROL":"WORKSPACE / LAYOUT CONTROL",
"YOUR WORK.":"YOUR WORK.","YOUR ARRANGEMENT.":"YOUR ARRANGEMENT.","Engineering domains.":"Engineering domains.",
"QUICK ACCESS":"QUICK ACCESS","Workspace controls":"Workspace controls","Drag modules":"Drag modules","Persist layout":"Persist layout",
"Reset arrangement":"Reset arrangement","Project index":"Project index","Workspace settings.":"Workspace settings.",
"Motion & display":"Motion & display","Reduced motion":"Reduced motion","Compact layout preference":"Compact layout preference","Workspace data":"Workspace data",
"An independent technology initiative turning research, experimentation and engineering into practical digital systems.":"An independent technology initiative turning research, experimentation and engineering into practical digital systems.",
"GitHub ↗":"GitHub ↗","© 2026 VEYROST · Independent engineering initiative":"© 2026 VEYROST · Independent engineering initiative",
"Built around real repositories · Designed for transparent progress":"Built around real repositories · Designed for transparent progress"
},
ru: {
"Overview":"Обзор","Projects":"Проекты","Workspace":"Рабочая среда","Company":"Компания","Research":"Исследования","Contact":"Контакты",
"AURA OFF":"AURA ВЫКЛ","AURA ON":"AURA ВКЛ","MOVE ITEMS":"ПЕРЕМЕСТИТЬ БЛОКИ","FINISH EDIT":"ЗАВЕРШИТЬ РЕДАКТИРОВАНИЕ",
"INDEPENDENT TECHNOLOGY INITIATIVE · TAJIKISTAN":"НЕЗАВИСИМАЯ ТЕХНОЛОГИЧЕСКАЯ ИНИЦИАТИВА · ТАДЖИКИСТАН",
"ENGINEERING":"ИНЖЕНЕРИЯ","WHAT'S NEXT.":"ЧТО ДАЛЬШЕ.",
"VEYROST is an independent engineering ecosystem: focused products, applied research and software systems built around real problems. One platform connects every project, discipline and experiment.":"VEYROST — независимая инженерная экосистема: специализированные продукты, прикладные исследования и программные системы для решения реальных задач. Одна платформа объединяет проекты, направления и эксперименты.",
"EXPLORE THE PORTFOLIO ↗":"ИЗУЧИТЬ ПОРТФОЛИО ↗","OUR ENGINEERING MODEL":"НАША ИНЖЕНЕРНАЯ МОДЕЛЬ","OPEN WORKSPACE":"ОТКРЫТЬ РАБОЧУЮ СРЕДУ",
"Many systems. One engineering direction.":"Множество систем. Единое инженерное направление.","Core Platform":"Основная платформа","Products & Platforms":"Продукты и платформы","AI & Security":"ИИ и безопасность",
"Developer Systems":"Инструменты разработчика","Creative Interfaces":"Креативные интерфейсы","Research & Prototyping":"Исследования и прототипирование",
"Focused products. Measurable purpose.":"Целевые продукты. Измеримый результат.","PROJECTS":"ПРОЕКТЫ","IN MOTION.":"В РАЗВИТИИ.",
"Find a system by purpose.":"Найдите систему по её назначению.","All":"Все","Core platform":"Основная платформа","Platforms":"Платформы","Commerce":"Электронная коммерция",
"AI & security":"ИИ и безопасность","AI & interaction":"ИИ и взаимодействие","Developer tools":"Инструменты разработчика","Creative tools":"Творческие инструменты",
"Data & research":"Данные и исследования","Research & hardware":"Исследования и оборудование","Experiments":"Эксперименты","Private systems":"Закрытые системы",
"Public portfolio. Private work protected.":"Открытое портфолио. Закрытые проекты защищены.","COMPANY / ENGINEERING MODEL":"КОМПАНИЯ / ИНЖЕНЕРНАЯ МОДЕЛЬ",
"BUILT WITH":"СОЗДАНО С","ENGINEERING DISCIPLINE.":"ИНЖЕНЕРНОЙ ДИСЦИПЛИНОЙ.","A connected engineering ecosystem.":"Связанная инженерная экосистема.",
"MISSION":"МИССИЯ","Turn ideas into useful systems.":"Превращать идеи в полезные системы.","OPERATING PRINCIPLE":"ПРИНЦИП РАБОТЫ",
"Evidence over appearance.":"Факты важнее внешнего вида.","Specialized roles. Shared standards.":"Специализированные роли. Общие стандарты.",
"Product Strategy & Research":"Продуктовая стратегия и исследования","Systems Architecture":"Архитектура систем","Experience & Interface":"Пользовательский опыт и интерфейс",
"AI & Automation":"ИИ и автоматизация","Security & Reliability":"Безопасность и надёжность","Documentation & Release":"Документация и выпуск",
"How work moves from idea to release.":"Путь от идеи до выпуска.","Inspect source":"Анализ исходного кода","Define scope":"Определение объёма","Build & test":"Разработка и тестирование","Deploy & verify":"Развёртывание и проверка",
"CONTACT / COLLABORATION":"КОНТАКТЫ / СОТРУДНИЧЕСТВО","LET'S BUILD":"ДАВАЙТЕ СОЗДАДИМ","SOMETHING USEFUL.":"ЧТО-ТО ПОЛЕЗНОЕ.",
"Start a conversation.":"Начните общение.","Email":"Электронная почта","Telegram":"Телеграм","GitHub":"GitHub",
"RESEARCH / APPLIED SYSTEMS":"ИССЛЕДОВАНИЯ / ПРИКЛАДНЫЕ СИСТЕМЫ","UNDERSTAND.":"ИЗУЧАТЬ.","TEST. ENGINEER.":"ТЕСТИРОВАТЬ. СОЗДАВАТЬ.",
"Questions connected to real builds.":"Вопросы, связанные с реальными разработками.","AI Agent Security":"Безопасность ИИ-агентов",
"Computer Vision & Interaction":"Компьютерное зрение и взаимодействие","Network Diagnostics":"Диагностика сетей","Software Quality & Trust":"Качество и надёжность ПО",
"Structured Product Data":"Структурированные данные о товарах","Hardware & Prototyping Roadmap":"План исследований оборудования и прототипов",
"Research must be inspectable.":"Исследования должны быть проверяемыми.","Source-backed statements":"Утверждения, подтверждённые исходным кодом","Release discipline":"Дисциплина выпуска",
"Research continues in the repositories.":"Исследования продолжаются в репозиториях.","WORKSPACE / LAYOUT CONTROL":"РАБОЧАЯ СРЕДА / УПРАВЛЕНИЕ МАКЕТОМ",
"YOUR WORK.":"ВАША РАБОТА.","YOUR ARRANGEMENT.":"ВАШ ПОРЯДОК.","Engineering domains.":"Инженерные направления.",
"QUICK ACCESS":"БЫСТРЫЙ ДОСТУП","Workspace controls":"Управление рабочей средой","Drag modules":"Перемещение модулей","Persist layout":"Сохранение макета",
"Reset arrangement":"Сброс расположения","Project index":"Каталог проектов","Workspace settings.":"Настройки рабочей среды.",
"Motion & display":"Анимация и отображение","Reduced motion":"Уменьшить анимацию","Compact layout preference":"Компактный макет","Workspace data":"Данные рабочей среды",
"An independent technology initiative turning research, experimentation and engineering into practical digital systems.":"Независимая технологическая инициатива, превращающая исследования, эксперименты и инженерную работу в практические цифровые системы.",
"GitHub ↗":"GitHub ↗","© 2026 VEYROST · Independent engineering initiative":"© 2026 VEYROST · Независимая инженерная инициатива",
"Built around real repositories · Designed for transparent progress":"Основано на реальных репозиториях · Прозрачность разработки"
},
tj: {
"Overview":"Шарҳи умумӣ","Projects":"Лоиҳаҳо","Workspace":"Муҳити корӣ","Company":"Ширкат","Research":"Таҳқиқот","Contact":"Тамос",
"AURA OFF":"AURA ХОМӮШ","AURA ON":"AURA ФАЪОЛ","MOVE ITEMS":"ҶОЙИВАЗКУНИИ ҚИСМҲО","FINISH EDIT":"АНҶОМИ ТАҲРИР",
"INDEPENDENT TECHNOLOGY INITIATIVE · TAJIKISTAN":"ТАШАББУСИ МУСТАҚИЛИ ТЕХНОЛОГӢ · ТОҶИКИСТОН",
"ENGINEERING":"МУҲАНДИСӢ","WHAT'S NEXT.":"ҚАДАМИ БАЪДӢ ЧИСТ?",
"VEYROST is an independent engineering ecosystem: focused products, applied research and software systems built around real problems. One platform connects every project, discipline and experiment.":"VEYROST экосистемаи мустақили муҳандисӣ мебошад: маҳсулоти ҳадафнок, таҳқиқоти амалӣ ва системаҳои нармафзор барои ҳалли масъалаҳои воқеӣ. Як платформа ҳамаи лоиҳаҳо, самтҳо ва таҷрибаҳоро муттаҳид мекунад.",
"EXPLORE THE PORTFOLIO ↗":"ЛОИҲАҲОРО БИНЕД ↗","OUR ENGINEERING MODEL":"МОДЕЛИ МУҲАНДИСИИ МО","OPEN WORKSPACE":"КУШОДАНИ МУҲИТИ КОРӢ",
"Many systems. One engineering direction.":"Системаҳои зиёд. Як самти муҳандисӣ.","Core Platform":"Платформаи асосӣ","Products & Platforms":"Маҳсулот ва платформаҳо","AI & Security":"Зеҳни сунъӣ ва амният",
"Developer Systems":"Абзорҳои таҳиягар","Creative Interfaces":"Интерфейсҳои эҷодӣ","Research & Prototyping":"Таҳқиқот ва намунасозӣ",
"Focused products. Measurable purpose.":"Маҳсулоти ҳадафнок. Натиҷаи ченшаванда.","PROJECTS":"ЛОИҲАҲО","IN MOTION.":"ДАР РАВАНДИ РУШД.",
"Find a system by purpose.":"Системаро аз рӯйи вазифа пайдо кунед.","All":"Ҳама","Core platform":"Платформаи асосӣ","Platforms":"Платформаҳо","Commerce":"Тиҷорати электронӣ",
"AI & security":"Зеҳни сунъӣ ва амният","AI & interaction":"Зеҳни сунъӣ ва ҳамкорӣ","Developer tools":"Абзорҳои таҳиягар","Creative tools":"Абзорҳои эҷодӣ",
"Data & research":"Маълумот ва таҳқиқот","Research & hardware":"Таҳқиқот ва таҷҳизот","Experiments":"Озмоишҳо","Private systems":"Системаҳои хусусӣ",
"Public portfolio. Private work protected.":"Портфолиои кушода. Лоиҳаҳои хусусӣ ҳифз шудаанд.","COMPANY / ENGINEERING MODEL":"ШИРКАТ / МОДЕЛИ МУҲАНДИСӢ",
"BUILT WITH":"СОХТАШУДА БО","ENGINEERING DISCIPLINE.":"ИНТИЗОМИ МУҲАНДИСӢ.","A connected engineering ecosystem.":"Экосистемаи ба ҳам пайвастаи муҳандисӣ.",
"MISSION":"РИСОЛАТ","Turn ideas into useful systems.":"Табдил додани ғояҳо ба системаҳои муфид.","OPERATING PRINCIPLE":"ПРИНСИПИ КОР",
"Evidence over appearance.":"Далел муҳимтар аз намуди зоҳирист.","Specialized roles. Shared standards.":"Нақшҳои махсус. Стандартҳои ягона.",
"Product Strategy & Research":"Стратегияи маҳсулот ва таҳқиқот","Systems Architecture":"Меъмории системаҳо","Experience & Interface":"Таҷрибаи корбар ва интерфейс",
"AI & Automation":"Зеҳни сунъӣ ва автоматизатсия","Security & Reliability":"Амният ва эътимоднокӣ","Documentation & Release":"Ҳуҷҷатгузорӣ ва нашр",
"How work moves from idea to release.":"Раванди кор аз ғоя то нашр.","Inspect source":"Омӯзиши рамзи манбаъ","Define scope":"Муайян кардани доираи кор","Build & test":"Сохтан ва санҷиш","Deploy & verify":"Ҷорӣ кардан ва тасдиқ",
"CONTACT / COLLABORATION":"ТАМОС / ҲАМКОРӢ","LET'S BUILD":"БИЁЕД СОЗЕМ","SOMETHING USEFUL.":"ЧИЗИ МУФИДРО.",
"Start a conversation.":"Суҳбатро оғоз кунед.","Email":"Почтаи электронӣ","Telegram":"Телеграм","GitHub":"GitHub",
"RESEARCH / APPLIED SYSTEMS":"ТАҲҚИҚОТ / СИСТЕМАҲОИ АМАЛӢ","UNDERSTAND.":"ФАҲМЕД.","TEST. ENGINEER.":"САНҶЕД. СОЗЕД.",
"Questions connected to real builds.":"Саволҳое, ки ба таҳияҳои воқеӣ вобастаанд.","AI Agent Security":"Амнияти агентҳои зеҳни сунъӣ",
"Computer Vision & Interaction":"Биниши компютерӣ ва ҳамкорӣ","Network Diagnostics":"Ташхиси шабака","Software Quality & Trust":"Сифат ва эътимоднокии нармафзор",
"Structured Product Data":"Маълумоти сохтории маҳсулот","Hardware & Prototyping Roadmap":"Нақшаи таҷҳизот ва намунасозӣ",
"Research must be inspectable.":"Таҳқиқот бояд санҷишшаванда бошад.","Source-backed statements":"Маълумоти тасдиқшуда бо манбаъ","Release discipline":"Интизоми нашр",
"Research continues in the repositories.":"Таҳқиқот дар репозиторҳо идома дорад.","WORKSPACE / LAYOUT CONTROL":"МУҲИТИ КОРӢ / ИДОРАКУНИИ ТАРҲ",
"YOUR WORK.":"КОРИ ШУМО.","YOUR ARRANGEMENT.":"ТАРТИБИ ШУМО.","Engineering domains.":"Самтҳои муҳандисӣ.",
"QUICK ACCESS":"ДАСТРАСИИ ЗУД","Workspace controls":"Идоракунии муҳити корӣ","Drag modules":"Ҷойивазкунии модулҳо","Persist layout":"Нигоҳ доштани тарҳ",
"Reset arrangement":"Аз нав танзим кардан","Project index":"Феҳристи лоиҳаҳо","Workspace settings.":"Танзимоти муҳити корӣ.",
"Motion & display":"Ҳаракат ва намоиш","Reduced motion":"Кам кардани аниматсия","Compact layout preference":"Тарҳи фишурда","Workspace data":"Маълумоти муҳити корӣ",
"An independent technology initiative turning research, experimentation and engineering into practical digital systems.":"Ташаббуси мустақили технологӣ, ки таҳқиқот, таҷриба ва муҳандисиро ба системаҳои рақамии амалӣ табдил медиҳад.",
"GitHub ↗":"GitHub ↗","© 2026 VEYROST · Independent engineering initiative":"© 2026 VEYROST · Ташаббуси мустақили муҳандисӣ",
"Built around real repositories · Designed for transparent progress":"Бар асоси репозиторҳои воқеӣ · Рушди шаффоф"
}
};
let language="en";
try{language=localStorage.getItem("veyrost-language")||"en"}catch(_){}
if(!dictionaries[language])language="en";
const originalText=new WeakMap();
const originalAttrs=new WeakMap();
function translateDocument(){
  const dict=dictionaries[language]||dictionaries.en;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const parent=node.parentElement;
    if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA|INPUT|OPTION)$/.test(parent.tagName))continue;
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
  $$("[placeholder],[title],[aria-label]").forEach(el=>{
    if(!originalAttrs.has(el))originalAttrs.set(el,{});
    const saved=originalAttrs.get(el);
    ["placeholder","title","aria-label"].forEach(name=>{
      if(el.hasAttribute(name)&&saved[name]===undefined)saved[name]=el.getAttribute(name);
      const source=saved[name];
      if(source)el.setAttribute(name,dict[source]??dictionaries.en[source]??source);
    });
  });
  $$("[data-lang]").forEach(el=>el.classList.toggle("active",el.dataset.lang===language));
  document.documentElement.lang=language==="tj"?"tg":language;
  document.documentElement.dataset.language=language;
}
function applyLanguage(){
  translateDocument();
  const t=dictionaries[language]||dictionaries.en;
  const edit=$("#layout-toggle");
  if(edit)edit.textContent=editMode?(t["FINISH EDIT"]||"FINISH EDIT"):(t["MOVE ITEMS"]||"MOVE ITEMS");
}
$$("[data-lang]").forEach(button=>button.addEventListener("click",()=>{
  const next=button.dataset.lang||"en";
  if(!dictionaries[next])return;
  language=next;
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
        <div class="card-foot"><span class="project-repo">${p.visibility==="private"?"PRIVATE REPOSITORY":"★ "+p.stars}</span>${p.visibility==="private"?'<span class="tag">OWNER ACCESS ONLY</span>':`<a class="arrow-link" href="${p.url}" target="_blank" rel="noopener">SOURCE REPOSITORY ↗</a>`}</div>
      </article>`).join(""):'<div class="empty-state">No projects match this search. Try another term or category.</div>';
    const publicMatches=list.filter(p=>p.visibility!=="private").length;
    const privateMatches=list.length-publicMatches;
    if(count)count.textContent=`${publicMatches} PUBLIC + ${privateMatches} PRIVATE`;
    registerMovable();restorePositions();
  };
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
  input?.addEventListener("input",render);filter?.addEventListener("change",render);render();
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
