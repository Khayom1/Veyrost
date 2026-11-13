import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { createServiceScene } from "./scene.js";

const canvas=document.querySelector("#scene");
const stateLabel=document.querySelector("#state");
const loading=document.querySelector("#loading");
const notice=document.querySelector("#notice");
let renderer,world,frame=0,last=0;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:!matchMedia("(max-width: 700px)").matches,powerPreference:"high-performance",alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  world=createServiceScene(THREE,new GLTFLoader(),stateLabel,notice);
  loading.classList.add("hidden");
  document.querySelector("#play").addEventListener("click",()=>world.sequence.play());
  document.querySelector("#reset").addEventListener("click",()=>world.sequence.reset());
  document.querySelector("#quality").addEventListener("change",e=>setQuality(e.target.value));
  function setQuality(mode){
    const mobile=matchMedia("(max-width: 700px)").matches;
    const tier=mode==="auto"?(mobile?"balanced":"cinematic"):mode;
    renderer.setPixelRatio(Math.min(devicePixelRatio,tier==="cinematic"?1.7:tier==="balanced"?1.25:.85));
    renderer.shadowMap.enabled=tier!=="low";
    world.setQuality(tier);
  }
  setQuality("auto");
  addEventListener("resize",()=>{
    renderer.setSize(innerWidth,innerHeight,false);
    world.camera.aspect=innerWidth/innerHeight;world.camera.updateProjectionMatrix();
  });
  document.addEventListener("visibilitychange",()=>{last=0});
  function render(now){
    frame=requestAnimationFrame(render);
    const dt=last?Math.min((now-last)/1000,.033):0;last=now;
    world.update(dt,now/1000);
    renderer.render(world.scene,world.camera);
  }
  frame=requestAnimationFrame(render);
}catch(error){
  console.error(error);
  loading.textContent="WEBGL INITIALIZATION FAILED — TRY A WEBGL-COMPATIBLE BROWSER";
  notice.textContent=error.message||"3D renderer unavailable";
}
