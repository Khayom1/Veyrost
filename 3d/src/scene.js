import { SEQUENCE_DURATION, stageAt, wireProgress } from "./sequence-contract.mjs";
import { solvePlanarTwoBone } from "./ik.mjs";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function createServiceScene(T,loader,stateLabel,notice){
 const scene=new T.Scene();scene.background=new T.Color(0x080d17);scene.fog=new T.FogExp2(0x080d17,.027);
 const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);camera.position.set(8,6.2,11);camera.lookAt(0,1,0);
 const hemi=new T.HemisphereLight(0x9db8df,0x1a1d27,2.0);scene.add(hemi);
 const key=new T.DirectionalLight(0xffe1bd,4.0);key.position.set(-5,9,6);key.castShadow=true;key.shadow.mapSize.set(1536,1536);scene.add(key);
 const rim=new T.PointLight(0x4bcde8,30,18);rim.position.set(5,4,-4);scene.add(rim);
 const mat=(color,metalness=0,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const floor=new T.Mesh(new T.PlaneGeometry(40,40),mat(0x151b27,.25,.82));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.receiveShadow=true;scene.add(floor);
 const grid=new T.GridHelper(40,40,0x33435a,0x202b3b);grid.position.y=-.025;scene.add(grid);
 const wall=new T.Group();wall.position.set(0,0,-3.1);scene.add(wall);
 const concrete=mat(0x596271,.15,.86),dark=mat(0x101a27,.55,.35),cyan=mat(0x55dced,.45,.25),gold=mat(0xd5a75c,.65,.25),white=mat(0xdbe2ed,.35,.28);
 const panel=new T.Mesh(new T.BoxGeometry(6,3.6,.3),concrete);panel.position.y=1.8;panel.castShadow=true;panel.receiveShadow=true;wall.add(panel);
 const hole=new T.Mesh(new T.BoxGeometry(1.5,1.1,.34),mat(0x080b11,.1,.95));hole.position.set(0,1.9,.18);wall.add(hole);
 const mount=new T.Group();mount.position.set(0,1.9,.42);wall.add(mount);
 const button=new T.Mesh(new T.BoxGeometry(.8,.55,.13),dark);button.castShadow=true;mount.add(button);
 const screen=new T.Mesh(new T.BoxGeometry(.66,.4,.025),cyan);screen.position.z=.08;button.add(screen);
 const sockets=[];
 for(let i=0;i<7;i++){const s=new T.Mesh(new T.CylinderGeometry(.055,.055,.035,12),gold);s.rotation.x=Math.PI/2;s.position.set(-.48+i*.16,-.42,.24);mount.add(s);sockets.push(s)}
 // Procedural vehicle placeholder; replace by optimized Blender GLB via VEHICLE_ASSET.
 const vehicle=new T.Group();vehicle.position.set(-5,0,2.5);scene.add(vehicle);const vehicleProxy=new T.Group();vehicle.add(vehicleProxy);
 const body=new T.Mesh(new T.BoxGeometry(3.2,1.35,1.65),white);body.position.y=1.05;body.castShadow=true;vehicleProxy.add(body);
 const cabin=new T.Mesh(new T.BoxGeometry(1.7,.9,1.5),dark);cabin.position.set(-.15,2.05,0);vehicleProxy.add(cabin);
 const wind=new T.Mesh(new T.BoxGeometry(1.15,.56,.035),mat(0x4d8095,.55,.15));wind.position.set(.35,2.08,.77);vehicleProxy.add(wind);
 const wheels=[];for(const x of [-1.05,1.05])for(const z of [-.83,.83]){const w=new T.Mesh(new T.CylinderGeometry(.38,.38,.2,24),dark);w.rotation.x=Math.PI/2;w.position.set(x,.48,z);w.castShadow=true;vehicleProxy.add(w);wheels.push(w)}
 function makeDoor(side){const pivot=new T.Group();pivot.position.set(side*1.15,1.55,side*.79);vehicleProxy.add(pivot);const d=new T.Mesh(new T.BoxGeometry(.85,1.05,.09),white);d.position.set(side*.42,-.12,0);d.castShadow=true;pivot.add(d);return pivot}
 const leftDoor=makeDoor(-1),rightDoor=makeDoor(1);
 // Articulated procedural stand-in with pivots; replace by skinned Blender rigs for production.
 function makeRobot(color){
  const root=new T.Group();scene.add(root);const proxy=new T.Group();root.add(proxy);const shell=mat(color,.72,.24),joint=mat(0x242d3a,.75,.3),glow=mat(0x67e7f0,.35,.2);
  const torso=new T.Mesh(new T.BoxGeometry(.58,.76,.34),shell);torso.position.y=1.35;proxy.add(torso);
  const chest=new T.Mesh(new T.BoxGeometry(.34,.12,.025),glow);chest.position.set(0,1.45,.18);proxy.add(chest);
  const head=new T.Mesh(new T.BoxGeometry(.4,.38,.36),shell);head.position.y=1.95;proxy.add(head);
  const visor=new T.Mesh(new T.BoxGeometry(.29,.1,.025),glow);visor.position.set(0,1.98,.19);proxy.add(visor);
  const limbs=[];
  for(const side of [-1,1]){
   const shoulder=new T.Group();shoulder.position.set(side*.38,1.62,0);proxy.add(shoulder);
   const upper=new T.Mesh(new T.CylinderGeometry(.105,.13,.48,12),shell);upper.position.y=-.25;shoulder.add(upper);
   const elbow=new T.Group();elbow.position.y=-.5;shoulder.add(elbow);
   const fore=new T.Mesh(new T.CylinderGeometry(.075,.095,.43,12),joint);fore.position.y=-.21;elbow.add(fore);
   const hand=new T.Group();hand.position.y=-.43;elbow.add(hand);
   const palm=new T.Mesh(new T.BoxGeometry(.16,.1,.2),shell);hand.add(palm);
   for(let f=0;f<4;f++){const finger=new T.Mesh(new T.BoxGeometry(.025,.12,.035),joint);finger.position.set(-.06+f*.04,-.09,.07);hand.add(finger)}
   const hip=new T.Group();hip.position.set(side*.19,.98,0);proxy.add(hip);
   const thigh=new T.Mesh(new T.CylinderGeometry(.12,.15,.48,12),shell);thigh.position.y=-.24;hip.add(thigh);
   const knee=new T.Group();knee.position.y=-.48;hip.add(knee);
   const shin=new T.Mesh(new T.CylinderGeometry(.075,.11,.43,12),joint);shin.position.y=-.21;knee.add(shin);
   const foot=new T.Mesh(new T.BoxGeometry(.2,.1,.34),shell);foot.position.set(0,-.45,.1);knee.add(foot);
   limbs.push({shoulder,elbow,hand,hip,knee,side});
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return {root,proxy,limbs,rig:null};
 }
 const tech=makeRobot(0xbcc8d8),assistant=makeRobot(0x657caa);
 tech.root.position.set(1.05,0,-2.0);assistant.root.position.set(-1.2,0,-2.0);
 const cableMat=[0xe1b75f,0x4fd3dc,0xe66c73,0x8bc18b,0x9c8cff,0xd6e2ee,0xd68b54].map(c=>mat(c,.25,.32));
 const cables=[];
 for(let i=0;i<7;i++){const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,.1,0),new T.Vector3(0,.2,0)]);const mesh=new T.Mesh(new T.TubeGeometry(curve,20,.018,6,false),cableMat[i]);scene.add(mesh);cables.push(mesh)}
 const assetWarnings=[];
 const rigAliases={idle:["idle","stand","breathing"],walk:["walk","walking","locomotion"],repair:["repair","work","working","connect"],board:["enter","boarding","sit"]};
 function bindRobotAsset(actor,gltf,kind){
  actor.proxy.visible=false;
  const model=gltf.scene;model.name=kind+"-skinned-rig";actor.root.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const bones={};model.traverse(o=>{if(o.isBone)bones[o.name.toLowerCase()]=o});
  const mixer=new T.AnimationMixer(model),actions={};
  for(const clip of gltf.animations||[]){actions[clip.name.toLowerCase()]=mixer.clipAction(clip)}
  actor.rig={mixer,actions,bones,model,active:null};
  notice.textContent=kind+" skinned GLB loaded · "+Object.keys(bones).length+" bones · "+Object.keys(actions).length+" clips";
 }
 function bindVehicleAsset(gltf){
  vehicleProxy.visible=false;
  const model=gltf.scene;model.name="service-vehicle-glb";vehicle.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const left=model.getObjectByName("door_left_pivot")||model.getObjectByName("Door_Left_Pivot");
  const right=model.getObjectByName("door_right_pivot")||model.getObjectByName("Door_Right_Pivot");
  if(left){leftDoor.parent?.remove(leftDoor);vehicle.userData.leftDoor=left}
  if(right){rightDoor.parent?.remove(rightDoor);vehicle.userData.rightDoor=right}
  notice.textContent="Vehicle GLB loaded · "+(left&&right?"hinge pivots detected":"door pivot nodes not found");
 }
 const ASSET_BASE="./assets/";
 loader.load(ASSET_BASE+"service-vehicle.glb",bindVehicleAsset,undefined,()=>assetWarnings.push("vehicle GLB missing; procedural proxy active"));
 loader.load(ASSET_BASE+"robot-technician.glb",g=>bindRobotAsset(tech,g,"technician"),undefined,()=>assetWarnings.push("technician GLB missing; procedural proxy active"));
 loader.load(ASSET_BASE+"robot-assistant.glb",g=>bindRobotAsset(assistant,g,"assistant"),undefined,()=>assetWarnings.push("assistant GLB missing; procedural proxy active"));
 function getHandWorld(actor,side){
  actor.root.updateMatrixWorld(true);
  const bone=actor.rig?.bones[`hand_${side}`];
  if(bone)return bone.getWorldPosition(new T.Vector3());
  return actor.limbs[side==="r"?1:0].hand.getWorldPosition(new T.Vector3());
 }
 function aimSkinnedArm(actor,side,target){
  const rig=actor.rig;if(!rig)return;
  const upper=rig.bones[`upper_arm_${side}`],fore=rig.bones[`forearm_${side}`],hand=rig.bones[`hand_${side}`];
  if(!upper||!fore||!hand)return;
  actor.root.updateMatrixWorld(true);
  const shoulder=upper.getWorldPosition(new T.Vector3());
  const upperLength=fore.position.length(),foreLength=hand.position.length();
  const delta=target.clone().sub(shoulder),rawDistance=delta.length();
  const distance=clamp(rawDistance,Math.abs(upperLength-foreLength)+.015,upperLength+foreLength-.015);
  const direction=delta.normalize();
  const pole=new T.Vector3(side==="l"?-1:1,0,0);
  let perpendicular=new T.Vector3().crossVectors(direction,pole);
  if(perpendicular.lengthSq()<1e-5)perpendicular.crossVectors(direction,new T.Vector3(0,1,0));
  perpendicular.normalize();
  const along=(upperLength*upperLength-foreLength*foreLength+distance*distance)/(2*distance);
  const height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
  const elbowTarget=shoulder.clone().addScaledVector(direction,along).addScaledVector(perpendicular,height);
  const aimBone=(bone,child,from,to)=>{
   const parent=bone.parent;
   parent.updateWorldMatrix(true,false);
   const inverse=parent.getWorldQuaternion(new T.Quaternion()).invert();
   const localDirection=to.clone().sub(from).normalize().applyQuaternion(inverse);
   const restDirection=child.position.clone().normalize();
   bone.quaternion.setFromUnitVectors(restDirection,localDirection);
   actor.root.updateMatrixWorld(true);
  };
  aimBone(upper,fore,shoulder,elbowTarget);
  const elbow=fore.getWorldPosition(new T.Vector3());
  aimBone(fore,hand,elbow,target);
  actor.root.updateMatrixWorld(true);
 }
 function updateCableMeshes(time){
  cables.forEach((c,i)=>{
   const progress=wireProgress(time,i),end=sockets[i].getWorldPosition(new T.Vector3());
   const start=getHandWorld(assistant,"r"),tip=start.clone().lerp(end,progress);
   const curve=new T.CatmullRomCurve3([start,new T.Vector3((start.x+end.x)/2,1.65,-2.0),tip]);
   c.geometry.dispose();c.geometry=new T.TubeGeometry(curve,18,.018,6,false);
   c.visible=time>=14+i*1.8;c.userData.locked=progress>=1;
  });
 }
 function setRigAction(actor,state){
  if(!actor.rig)return;
  const wanted=Object.keys(actor.rig.actions).find(name=>rigAliases[state].some(alias=>name.includes(alias)));
  if(wanted===actor.rig.active)return;
  if(actor.rig.active)actor.rig.actions[actor.rig.active]?.fadeOut(.18);
  if(wanted){actor.rig.actions[wanted].reset().fadeIn(.18).play();actor.rig.active=wanted}else actor.rig.active=null;
 } const seq={time:0,running:false,duration:SEQUENCE_DURATION,play(){this.running=true;this.time=0;},reset(){this.running=false;this.time=0;updatePose(0)}};
 function updatePose(t){
  const phase=(start,end)=>smooth((t-start)/(end-start));
  const approach=phase(0,3),doorsOut=phase(3,4),exit=phase(4,7),walk=phase(7,11),repair=phase(11,31),returnWalk=phase(35,40),board=phase(40,44),depart=phase(44,46);
  vehicle.position.x=-5+approach*1.5-depart*7;
  const doorL=vehicle.userData.leftDoor||leftDoor,doorR=vehicle.userData.rightDoor||rightDoor;
  doorL.rotation.y=-doorsOut*.95+phase(40,41)*.95;
  doorR.rotation.y=doorsOut*.95-phase(40,41)*.95;
  const p1=new T.Vector3(-.95,0,.9),p2=new T.Vector3(.95,0,.9);
  for(const [i,actor] of [[0,tech],[1,assistant]]){
   const startX=i===0?-4:-4.8,goalX=i===0?1.05:-1.2;
   const out=clamp((walk-.0),0,1),back=returnWalk;
   actor.root.position.set(startX+(goalX-startX)*out+(startX-goalX)*back,0,-2.0);
   actor.root.position.x+=board*(i===0?-.3:.3);
   actor.root.rotation.y=repair>.05&&repair<.8?(i===0?-.18:.18):0;
   const gait=walk>0&&walk<1?Math.sin(t*9+i)*.55:returnWalk>0&&returnWalk<1?Math.sin(t*9+i)*.55:0;
   actor.limbs.forEach((l,j)=>{l.hip.rotation.x=(j===0?1:-1)*gait;l.knee.rotation.x=Math.max(0,-gait)*.8;l.shoulder.rotation.x=-gait*.45;l.elbow.rotation.z=i===0?-.35:.15});
   const rigState=((walk>0&&walk<1)||(returnWalk>0&&returnWalk<1))?"walk":repair>0&&repair<1?"repair":board>0&&board<1?"board":"idle";
   setRigAction(actor,rigState);
  }
  // Button is detached during the repair interval, then returned to its mount.
  const detached=t>=11&&t<31;
  tech.ikTargets=detached?[
   {side:"l",target:new T.Vector3(.57,2.03,-2.35)},
   {side:"r",target:new T.Vector3(1.13,2.03,-2.35)}
  ]:[];

  if(detached){mount.remove(button);scene.add(button);button.position.set(.85,2.05,-2.35);button.rotation.y=-.16}
  else{if(button.parent!==mount){scene.remove(button);mount.add(button)}button.position.set(0,0,0);button.rotation.set(0,0,0)}
  // Two-bone IK aims both technician hands at the detached MENU.
  function aimArm(actor,limb,target){
   actor.root.updateMatrixWorld(true);
   const local=actor.root.worldToLocal(target.clone());
   const solution=solvePlanarTwoBone(local.x-limb.side*.38,local.y-1.62,.5,.43);
   limb.shoulder.rotation.z=solution.shoulder;
   limb.elbow.rotation.z=solution.elbow;
  }
  if(t>=11&&t<31){
   const center=new T.Vector3(.85,2.05,-2.35);
   aimArm(tech,tech.limbs[0],center.clone().add(new T.Vector3(-.28,-.02,0)));
   aimArm(tech,tech.limbs[1],center.clone().add(new T.Vector3(.28,-.02,0)));
  }
  assistant.ikTargets=[];
  for(let i=0;i<7;i++){
   const active=t>=14+i*1.8&&t<15.1+i*1.8;
   if(active){
    const end=sockets[i].getWorldPosition(new T.Vector3());
    assistant.ikTargets=[{side:"r",target:end.clone().add(new T.Vector3(0,.04,.08))}];
    aimArm(assistant,assistant.limbs[1],end.clone().add(new T.Vector3(0,.04,.08)));
    break;
   }
  }
  stateLabel.textContent=stageAt(t).replaceAll("_"," ");
  if(t>=seq.duration){seq.running=false;stateLabel.textContent="SEQUENCE COMPLETE"}
 }
 updatePose(0);
 function update(dt){
  if(seq.running){seq.time+=dt;updatePose(Math.min(seq.time,seq.duration))}
  for(const actor of [tech,assistant])actor.rig?.mixer.update(dt);
  for(const actor of [tech,assistant]){
   for(const target of actor.ikTargets||[])aimSkinnedArm(actor,target.side,target.target);
   actor.root.updateMatrixWorld(true);
  }
  updateCableMeshes(seq.time);
 }
 function setQuality(tier){const max=tier==="cinematic"?1536:tier==="balanced"?1024:512;key.shadow.mapSize.set(max,max);key.shadow.needsUpdate=true}
 return {scene,camera,sequence:seq,update, setQuality};
}
