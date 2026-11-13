#!/usr/bin/env python3
"""Deterministic procedural GLB asset generator for VEYROST 3D.
Produces articulated, skinned robot GLBs and a multi-part service van GLB.
No external Python packages are required.
"""
from __future__ import annotations
import json, math, struct, pathlib, argparse, os, gzip
from collections import defaultdict

OUT = pathlib.Path(os.environ.get('VEYROST_ASSET_OUTPUT', pathlib.Path(__file__).resolve().parents[1] / 'assets'))

class GLB:
    def __init__(self, materials):
        self.doc = {"asset":{"version":"2.0","generator":"VEYROST Procedural Asset Studio 1.0"},
                    "scene":0,"scenes":[{"nodes":[]}],"nodes":[],"meshes":[],"materials":materials,
                    "accessors":[],"bufferViews":[],"buffers":[{"byteLength":0}]}
        self.bin = bytearray()
    def add_bytes(self, data, target=None, stride=None):
        while len(self.bin)%4: self.bin.append(0)
        off=len(self.bin); self.bin.extend(data)
        v={"buffer":0,"byteOffset":off,"byteLength":len(data)}
        if target: v["target"]=target
        if stride: v["byteStride"]=stride
        self.doc["bufferViews"].append(v)
        return len(self.doc["bufferViews"])-1
    def accessor(self, values, ctype, typ, target=None, calc_bounds=False, normalized=False):
        # values is a flat list; component type: 5126=float, 5123=u16, 5121=u8
        fm={5126:'f',5123:'H',5121:'B'}[ctype]
        raw=struct.pack('<'+fm*len(values),*values)
        view=self.add_bytes(raw,target)
        comp={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[typ]
        count=len(values)//comp
        a={"bufferView":view,"componentType":ctype,"count":count,"type":typ}
        if normalized: a['normalized']=True
        if calc_bounds and typ in ('VEC3','SCALAR'):
            chunks=[values[i:i+comp] for i in range(0,len(values),comp)]
            a['min']=[min(x[j] for x in chunks) for j in range(comp)]
            a['max']=[max(x[j] for x in chunks) for j in range(comp)]
        self.doc['accessors'].append(a); return len(self.doc['accessors'])-1
    def add_material(self,name,color,metal=.35,rough=.38,emissive=None):
        m={"name":name,"pbrMetallicRoughness":{"baseColorFactor":color,"metallicFactor":metal,"roughnessFactor":rough}}
        if emissive: m['emissiveFactor']=emissive
        self.doc['materials'].append(m); return len(self.doc['materials'])-1
    def add_node(self,node,parent=None,scene=True):
        self.doc['nodes'].append(node); idx=len(self.doc['nodes'])-1
        if parent is not None: self.doc['nodes'][parent].setdefault('children',[]).append(idx)
        elif scene: self.doc['scenes'][0]['nodes'].append(idx)
        return idx
    def add_mesh(self,positions,normals,indices,material,joints=None,weights=None,name='mesh'):
        attrs={"POSITION":self.accessor(positions,5126,'VEC3',34962,True),
               "NORMAL":self.accessor(normals,5126,'VEC3',34962)}
        if joints is not None:
            attrs['JOINTS_0']=self.accessor(joints,5121,'VEC4',34962)
            attrs['WEIGHTS_0']=self.accessor(weights,5121,'VEC4',34962,normalized=True)
        ind=self.accessor(indices,5123,'SCALAR',34963)
        prim={"attributes":attrs,"indices":ind,"material":material,"mode":4}
        self.doc['meshes'].append({"name":name,"primitives":[prim]})
        return len(self.doc['meshes'])-1
    def write(self,path):
        self.doc['buffers'][0]['byteLength']=len(self.bin)
        js=json.dumps(self.doc,separators=(',',':'),ensure_ascii=False).encode('utf-8')
        while len(js)%4: js+=b' '
        while len(self.bin)%4: self.bin.append(0)
        total=12+8+len(js)+8+len(self.bin)
        data=struct.pack('<III',0x46546C67,2,total)+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(self.bin),b'BIN\x00')+self.bin
        pathlib.Path(path).write_bytes(data)
        return len(data)

# primitive building blocks; all coordinates are in model-local meters.
def add_box(acc, center, size, joint=None):
    cx,cy,cz=center; sx,sy,sz=[v/2 for v in size]
    faces=[((0,0,1),[(-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)]),
           ((0,0,-1),[(sx,-sy,-sz),(-sx,-sy,-sz),(-sx,sy,-sz),(sx,sy,-sz)]),
           ((1,0,0),[(sx,-sy,sz),(sx,-sy,-sz),(sx,sy,-sz),(sx,sy,sz)]),
           ((-1,0,0),[(-sx,-sy,-sz),(-sx,-sy,sz),(-sx,sy,sz),(-sx,sy,-sz)]),
           ((0,1,0),[(-sx,sy,sz),(sx,sy,sz),(sx,sy,-sz),(-sx,sy,-sz)]),
           ((0,-1,0),[(-sx,-sy,-sz),(sx,-sy,-sz),(sx,-sy,sz),(-sx,-sy,sz)])]
    for n,verts in faces:
        base=len(acc['p'])//3
        for v in verts:
            acc['p'] += [cx+v[0],cy+v[1],cz+v[2]]; acc['n'] += list(n)
            if joint is not None: acc['j'] += [joint,0,0,0]; acc['w'] += [255,0,0,0]
        acc['i'] += [base,base+1,base+2,base,base+2,base+3]

def add_sphere(acc, center, scale, joint=None, seg=8, rings=6):
    cx,cy,cz=center; rx,ry,rz=scale; base=len(acc['p'])//3
    for y in range(rings+1):
        v=y/rings; phi=math.pi*v
        for x in range(seg+1):
            u=x/seg; theta=2*math.pi*u
            nx=math.sin(phi)*math.cos(theta); ny=math.cos(phi); nz=math.sin(phi)*math.sin(theta)
            acc['p'] += [cx+rx*nx,cy+ry*ny,cz+rz*nz]
            nn=(nx/max(rx,1e-6),ny/max(ry,1e-6),nz/max(rz,1e-6)); ll=math.sqrt(sum(t*t for t in nn))
            acc['n'] += [t/ll for t in nn]
            if joint is not None: acc['j'] += [joint,0,0,0]; acc['w'] += [255,0,0,0]
    for y in range(rings):
        for x in range(seg):
            a=base+y*(seg+1)+x; b=a+seg+1
            acc['i'] += [a,a+1,b,a+1,b+1,b]

def add_cylinder(acc, a, b, radius, joint=None, segments=8, radius2=None):
    # cylinder aligned from a to b, with a small taper if radius2 is supplied
    ax,ay,az=a; bx,by,bz=b; dx,dy,dz=bx-ax,by-ay,bz-az
    length=math.sqrt(dx*dx+dy*dy+dz*dz); ux,uy,uz=dx/length,dy/length,dz/length
    # orthonormal ring basis
    ref=(0,0,1) if abs(uz)<.9 else (1,0,0)
    vx=uy*ref[2]-uz*ref[1]; vy=uz*ref[0]-ux*ref[2]; vz=ux*ref[1]-uy*ref[0]
    vl=math.sqrt(vx*vx+vy*vy+vz*vz); vx,vy,vz=vx/vl,vy/vl,vz/vl
    wx=uy*vz-uz*vy; wy=uz*vx-ux*vz; wz=ux*vy-uy*vx
    base=len(acc['p'])//3
    for end,(cx,cy,cz),r in [(0,a,radius),(1,b,radius if radius2 is None else radius2)]:
        for k in range(segments):
            ang=2*math.pi*k/segments; ca,sa=math.cos(ang),math.sin(ang)
            nx=vx*ca+wx*sa; ny=vy*ca+wy*sa; nz=vz*ca+wz*sa
            acc['p'] += [cx+r*nx,cy+r*ny,cz+r*nz]; acc['n'] += [nx,ny,nz]
            if joint is not None: acc['j'] += [joint,0,0,0]; acc['w'] += [255,0,0,0]
    for k in range(segments):
        n=(k+1)%segments; a0=base+k; a1=base+n; b0=base+segments+k; b1=base+segments+n
        acc['i'] += [a0,a1,b0,a1,b1,b0]

def acc(): return {'p':[],'n':[],'i':[],'j':[],'w':[]}

# robot joint hierarchy and bind-pose global positions
JOINTS=[
 ('root',None,(0,0,0)),('hips','root',(0,.92,0)),('spine','hips',(0,.22,0)),('chest','spine',(0,.22,0)),('neck','chest',(0,.38,0)),('head','neck',(0,.13,0)),
 ('clavicle_l','chest',(-.22,.24,0)),('upper_arm_l','clavicle_l',(-.13,-.11,0)),('forearm_l','upper_arm_l',(-.015,-.34,0)),('hand_l','forearm_l',(-.012,-.30,.015)),
 ('clavicle_r','chest',(.22,.24,0)),('upper_arm_r','clavicle_r',(.13,-.11,0)),('forearm_r','upper_arm_r',(.015,-.34,0)),('hand_r','forearm_r',(.012,-.30,.015)),
 ('thigh_l','hips',(-.14,-.05,0)),('shin_l','thigh_l',(0,-.40,0)),('foot_l','shin_l',(0,-.38,.02)),
 ('thigh_r','hips',(.14,-.05,0)),('shin_r','thigh_r',(0,-.40,0)),('foot_r','shin_r',(0,-.38,.02)),
]
# add finger groups as individual three-segment chains
for side,sign in [('l',-1),('r',1)]:
    for finger,xoff in [('thumb',-.075),('index',-.052),('middle',-.018),('ring',.018),('pinky',.052)]:
        parent='hand_'+side
        for seg in range(1,4):
            name=f'{finger}_{side}_{seg}'
            pos=(sign*xoff*.25,-.012,.055 if finger!='thumb' else .015) if seg==1 else (0,-.004,.026)
            JOINTS.append((name,parent,pos)); parent=name


def robot_asset(kind):
    if kind=='technician':
        palette=[('Graphite', [0.075,.105,.15,1],.72,.28),('CeramicBlue',[.10,.29,.48,1],.68,.24),('SafetyAmber',[1,.39,.055,1],.45,.28),('DarkJoint',[.025,.035,.05,1],.85,.3),('Visor',[.015,.12,.18,1],.65,.16),('SignalCyan',[.12,.88,1,1],.35,.2),('Metal',[.55,.66,.76,1],.8,.24)]
    else:
        palette=[('Graphite',[.07,.105,.14,1],.7,.3),('Porcelain',[.76,.84,.89,1],.42,.25),('Teal',[.055,.48,.48,1],.58,.22),('DarkJoint',[.025,.04,.055,1],.85,.3),('Visor',[.012,.08,.12,1],.7,.14),('SignalMint',[.15,1,.78,1],.35,.2),('Metal',[.58,.69,.76,1],.82,.24)]
    mats=[{"name":n,"pbrMetallicRoughness":{"baseColorFactor":c,"metallicFactor":m,"roughnessFactor":r}} for n,c,m,r in palette]
    g=GLB(mats); ids={n:i for i,(n,*_) in enumerate(palette)}
    globals={}; parent_map={name:parent for name,parent,_ in JOINTS}
    for name,parent,local in JOINTS:
        if parent is None: globals[name]=local
        else: globals[name]=tuple(globals[parent][i]+local[i] for i in range(3))
    ji={name:i for i,(name,_,_) in enumerate(JOINTS)}
    geo={i:acc() for i in range(len(mats))}
    def box(matname,c,s,bone): add_box(geo[ids[matname]],c,s,ji[bone])
    def sph(matname,c,s,bone,seg=8,rings=5): add_sphere(geo[ids[matname]],c,s,ji[bone],seg,rings)
    def cyl(matname,a,b,r,bone,r2=None): add_cylinder(geo[ids[matname]],a,b,r,ji[bone],8,r2)
    # torso / head assembly
    sph('CeramicBlue' if kind=='technician' else 'Porcelain',(0,1.47,0),(.29,.36,.19),'chest',12,8)
    box('Graphite',(0,1.08,0),(.44,.25,.28),'hips')
    sph('Graphite',(0,1.16,.015),(.23,.16,.17),'spine')
    box('SafetyAmber' if kind=='technician' else 'Teal',(0,1.5,.178),(.25,.095,.035),'chest')
    box('SignalCyan' if kind=='technician' else 'SignalMint',(0,1.5,.199),(.13,.026,.012),'chest')
    # shoulder armor and upper limbs
    for s,side in [(-1,'l'),(1,'r')]:
        sph('Metal',(s*.35,1.60,0),(.16,.16,.17),'clavicle_'+side)
        sph('CeramicBlue' if kind=='technician' else 'Porcelain',(s*.38,1.49,0),(.14,.18,.15),'upper_arm_'+side)
        cyl('DarkJoint',(s*.37,1.49,0),(s*.39,1.15,0),.085,'upper_arm_'+side,.07)
        sph('SafetyAmber' if kind=='technician' else 'Teal',(s*.39,1.14,0),(.09,.10,.10),'forearm_'+side)
        cyl('Metal',(s*.39,1.12,0),(s*.405,.83,.015),.067,'forearm_'+side,.055)
        sph('DarkJoint',(s*.405,.81,.02),(.075,.07,.07),'hand_'+side)
        box('CeramicBlue' if kind=='technician' else 'Porcelain',(s*.405,.78,.07),(.13,.09,.14),'hand_'+side)
        # knuckle guard and individually articulated phalanges
        for finger,xoff in [('thumb',-.075),('index',-.052),('middle',-.018),('ring',.018),('pinky',.052)]:
            sign=s
            origin=(s*.405+sign*xoff*.25,.77,.13 if finger!='thumb' else .085)
            par=f'{finger}_{side}_1'
            end1=(origin[0]+sign*xoff*.12,.75,origin[2]+.045)
            end2=(end1[0]+sign*xoff*.12,.735,end1[2]+.026)
            end3=(end2[0]+sign*xoff*.10,.72,end2[2]+.02)
            cyl('Metal',origin,end1,.018,par,.016)
            sph('DarkJoint',end1,(.019,.019,.019),par,8,6)
            cyl('Metal',end1,end2,.015,f'{finger}_{side}_2',.013)
            sph('DarkJoint',end2,(.016,.016,.016),f'{finger}_{side}_2',8,6)
            cyl('Metal',end2,end3,.012,f'{finger}_{side}_3',.009)
        # legs
        sph('Metal',(s*.15,.88,0),(.13,.12,.13),'thigh_'+side)
        cyl('CeramicBlue' if kind=='technician' else 'Porcelain',(s*.15,.86,0),(s*.15,.48,0),.105,'thigh_'+side,.085)
        sph('DarkJoint',(s*.15,.47,0),(.09,.09,.09),'shin_'+side)
        cyl('Metal',(s*.15,.45,0),(s*.15,.10,.015),.066,'shin_'+side,.052)
        box('Graphite',(s*.15,.065,.105),(.19,.11,.32),'foot_'+side)
        box('SafetyAmber' if kind=='technician' else 'Teal',(s*.15,.07,.245),(.13,.04,.06),'foot_'+side)
    sph('CeramicBlue' if kind=='technician' else 'Porcelain',(0,1.90,0),(.205,.20,.18),'head',12,8)
    box('Visor',(0,1.92,.158),(.30,.105,.045),'head')
    box('SignalCyan' if kind=='technician' else 'SignalMint',(0,1.92,.185),(.21,.018,.012),'head')
    # technical detailing: side chest vents and back power module
    box('Graphite',(0,1.37,-.17),(.28,.30,.08),'chest')
    for k in range(4): box('Metal',(-.09+k*.06,1.39,-.215),(.025,.13,.012),'chest')
    if kind=='technician':
        # utility belt and compact forearm tool modules
        box('SafetyAmber',(0,1.22,.17),(.38,.075,.04),'hips')
        for s,side in [(-1,'l'),(1,'r')]: box('Graphite',(s*.40,1.0,.03),(.18,.12,.14),'forearm_'+side)
    else:
        # distinctive assistant back sensor pack and shoulder signal lamps
        box('Teal',(0,1.48,-.235),(.25,.32,.12),'chest')
        sph('SignalMint',(0,1.68,-.22),(.055,.055,.04),'chest')
    # mesh nodes grouped by material; all are true skinned meshes with JOINTS_0/WEIGHTS_0
    for mi,geoacc in geo.items():
        if not geoacc['p']: continue
        mesh=g.add_mesh(geoacc['p'],geoacc['n'],geoacc['i'],mi,geoacc['j'],geoacc['w'],palette[mi][0]+' geometry')
        g.add_node({'name':palette[mi][0]+'_skinned_mesh','mesh':mesh,'skin':0})
    # skeleton nodes with named bones and hierarchical bind pose
    node_for={}
    for name,parent,local in JOINTS:
        node_for[name]=g.add_node({'name':name,'translation':list(local)})
        if parent is not None:
            # Move this node out of scene roots; its parent relationship is created after all nodes exist.
            g.doc['scenes'][0]['nodes'].remove(node_for[name])
    for name,parent,_ in JOINTS:
        if parent is not None: g.doc['nodes'][node_for[parent]].setdefault('children',[]).append(node_for[name])
    # root was already registered in the scene; only child bones are parented here.
    inv=[]
    for name,_,_ in JOINTS:
        x,y,z=globals[name]
        inv += [1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1]
    ibm=g.accessor(inv,5126,'MAT4')
    g.doc['skins']=[{'name':kind+'_humanoid_skin','inverseBindMatrices':ibm,'skeleton':node_for['root'],'joints':[node_for[n] for n,_,_ in JOINTS]}]
    # four semantic clips. Pose keys are baked as local bone quaternion tracks.
    def qx(angle): return [math.sin(angle/2),0,0,math.cos(angle/2)]
    def add_anim(name,duration,keys):
        samplers=[];channels=[]
        for bone,rotations in keys.items():
            times=[k[0] for k in rotations]; vals=[]
            for _,ang in rotations: vals += qx(ang)
            inp=g.accessor(times,5126,'SCALAR',calc_bounds=True); out=g.accessor(vals,5126,'VEC4')
            si=len(samplers); samplers.append({'input':inp,'output':out,'interpolation':'LINEAR'})
            channels.append({'sampler':si,'target':{'node':node_for[bone],'path':'rotation'}})
        g.doc.setdefault('animations',[]).append({'name':name,'samplers':samplers,'channels':channels})
    add_anim('Idle',2.0,{'chest':[(0,0),(.5,.025),(1,0),(1.5,-.025),(2,0)],'head':[(0,0),(1,.018),(2,0)]})
    add_anim('Walk',1.0,{
      'thigh_l':[(0,-.48),(.5,.48),(1,-.48)],'thigh_r':[(0,.48),(.5,-.48),(1,.48)],
      'upper_arm_l':[(0,.30),(.5,-.30),(1,.30)],'upper_arm_r':[(0,-.30),(.5,.30),(1,-.30)],
      'shin_l':[(0,.10),(.5,0),(1,.10)],'shin_r':[(0,0),(.5,.10),(1,0)]})
    add_anim('Repair',2.0,{
      'upper_arm_l':[(0,-.52),(2,-.52)],'upper_arm_r':[(0,-.52),(2,-.52)],
      'forearm_l':[(0,.42),(2,.42)],'forearm_r':[(0,-.42),(2,-.42)],'head':[(0,.06),(2,.06)]})
    add_anim('Board',1.4,{
      'hips':[(0,0),(1.4,-.08)],'thigh_l':[(0,0),(1.4,-.55)],'thigh_r':[(0,0),(1.4,-.55)],
      'shin_l':[(0,0),(1.4,.9)],'shin_r':[(0,0),(1.4,.9)],
      'upper_arm_l':[(0,0),(1.4,-.28)],'upper_arm_r':[(0,0),(1.4,-.28)]})
    g.doc['nodes']=[{**n,**({'children':n['children']} if 'children' in n else {})} for n in g.doc['nodes']]
    return g


def vehicle_asset():
    palette=[('BodyWhite',[.76,.82,.88,1],.42,.28),('DarkGraphite',[.035,.055,.08,1],.78,.32),('Glass',[.025,.14,.20,1],.65,.14),('SignalAmber',[1,.38,.045,1],.45,.25),('SignalCyan',[.10,.75,.95,1],.4,.2),('Rubber',[.012,.016,.022,1],.05,.82),('Metal',[.48,.57,.66,1],.88,.24),('Interior',[.10,.14,.19,1],.25,.55)]
    mats=[{"name":n,"pbrMetallicRoughness":{"baseColorFactor":c,"metallicFactor":m,"roughnessFactor":r}} for n,c,m,r in palette]
    g=GLB(mats); ids={n:i for i,(n,*_) in enumerate(palette)}; geo={i:acc() for i in range(len(palette))}
    def b(m,c,s):add_box(geo[ids[m]],c,s)
    def s(m,c,sz):add_sphere(geo[ids[m]],c,sz,seg=10,rings=6)
    def cy(m,a,z,r):add_cylinder(geo[ids[m]],a,z,r,segments=24)
    # central chassis, lower shell, upper cargo body, front cab and bonnet
    b('DarkGraphite',(0,.55,0),(1.78,.36,4.9))
    b('BodyWhite',(0,1.02,-.10),(1.92,.86,4.65))
    b('BodyWhite',(0,1.48,-.70),(1.88,.65,2.85))
    b('BodyWhite',(0,1.34,1.55),(1.86,.42,1.12))
    b('DarkGraphite',(0,1.20,2.12),(1.90,.16,.18))
    # windshield and side cabin glass
    b('Glass',(0,1.78,1.91),(1.48,.52,.045))
    for x in [-.965,.965]:
        b('Glass',(x,1.77,1.20),(.035,.48,1.12))
        b('Metal',(x*1.01,1.42,.94),(.055,.08,.12))
        # long cargo-side inset / trim stripe
        b('DarkGraphite',(x*1.01,1.10,-.55),(.035,.11,2.48))
        b('SignalCyan',(x*1.03,1.11,-.55),(.025,.035,1.70))
        b('SignalAmber',(x*1.03,.96,1.65),(.025,.09,.34))
        # mirrors and handles
        s('DarkGraphite',(x*1.05,1.80,.98),(.10,.075,.13))
        b('Metal',(x*1.04,1.26,-.05),(.04,.045,.19))
    # cargo roof rails / service modules
    b('DarkGraphite',(0,1.84,-.62),(1.12,.08,2.25))
    b('Metal',(-.43,1.94,-.62),(.055,.12,2.2)); b('Metal',(.43,1.94,-.62),(.055,.12,2.2))
    b('SignalCyan',(0,1.96,-.62),(.55,.045,.22))
    # front fascia, grille, headlamps, rear lamps
    b('DarkGraphite',(0,.94,2.40),(1.12,.30,.035))
    for k in range(7): b('Metal',(-.42+k*.14,.94,2.425),(.035,.20,.012))
    for x in [-.68,.68]:
        b('SignalCyan',(x,1.28,2.40),(.36,.16,.05)); b('SignalAmber',(x,.78,-2.43),(.22,.18,.05))
    b('BodyWhite',(0,.76,2.42),(1.76,.16,.10))
    # wheels with alloy hubs and circumferential detailing
    for x in [-.96,.96]:
        for z in [-1.62,1.58]:
            cy('Rubber',(x-.16,.48,z),(x+.16,.48,z),.39)
            s('Metal',(x*1.18,.48,z),(.045,.24,.24))
            s('DarkGraphite',(x*1.20,.48,z),(.05,.12,.12))
            for k in range(6):
                a=2*math.pi*k/6
                s('Metal',(x*1.22,.48+.17*math.cos(a),z+.17*math.sin(a)),(.035,.035,.035))
    # add all static geometry
    for mi,ga in geo.items():
        if not ga['p']: continue
        mesh=g.add_mesh(ga['p'],ga['n'],ga['i'],mi,name=palette[mi][0]+' vehicle surfaces')
        g.add_node({'name':palette[mi][0]+'_vehicle_mesh','mesh':mesh})
    # hinged sliding-side door panels under explicit pivot nodes.
    for side,label in [(-1,'left'),(1,'right')]:
        pivot=g.add_node({'name':f'door_{label}_pivot','translation':[side*.985,1.28,-.16]})
        g.doc['scenes'][0]['nodes'].remove(pivot)
        door_geo=acc()
        # Panel is placed in pivot local coordinates; swing around the forward vertical hinge.
        add_box(door_geo,[0,0,-.55],[.075,.98,1.08])
        add_box(door_geo,[side*.045,0,-.55],[.018,.90,.94])
        add_box(door_geo,[side*.058,-.28,-.55],[.018,.035,.22])
        mesh=g.add_mesh(door_geo['p'],door_geo['n'],door_geo['i'],ids['BodyWhite'],name=f'{label} opening door')
        door_node=g.add_node({'name':f'door_{label}_panel','mesh':mesh},parent=pivot,scene=False)
        # an inset window on upper cargo access door
        glass=acc(); add_box(glass,[side*.047,.22,-.55],[.02,.28,.57])
        gm=g.add_mesh(glass['p'],glass['n'],glass['i'],ids['Glass'],name=f'{label} door glass')
        g.add_node({'name':f'door_{label}_window','mesh':gm},parent=pivot,scene=False)
        g.doc['scenes'][0]['nodes'].append(pivot)
    # semantic anchor nodes for vehicle interactions
    g.add_node({'name':'vehicle_root_anchor','translation':[0,0,0]})
    return g


def validate(path):
    data=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',data,0)
    assert magic==0x46546C67 and version==2 and length==len(data)
    p=12; chunks=[]
    while p<len(data):
        n,typ=struct.unpack_from('<I4s',data,p); p+=8; chunks.append((typ,data[p:p+n])); p+=n
    doc=json.loads(next(c for t,c in chunks if t==b'JSON'))
    binchunk=next(c for t,c in chunks if t==b'BIN\x00')
    assert doc['asset']['version']=='2.0'
    for view in doc.get('bufferViews',[]):
        assert view['byteOffset']+view['byteLength']<=len(binchunk)
    for mesh in doc.get('meshes',[]):
        for prim in mesh['primitives']:
            attrs=prim['attributes']
            assert 'POSITION' in attrs and 'NORMAL' in attrs and 'indices' in prim
            if 'JOINTS_0' in attrs:
                assert 'WEIGHTS_0' in attrs
                assert doc['accessors'][attrs['JOINTS_0']]['count']==doc['accessors'][attrs['POSITION']]['count']
                assert doc['accessors'][attrs['WEIGHTS_0']]['count']==doc['accessors'][attrs['POSITION']]['count']
    names={n.get('name') for n in doc.get('nodes',[])}
    animations=[a['name'] for a in doc.get('animations',[])]
    skins=doc.get('skins',[])
    if path.name.startswith('robot-'):
        assert len(skins)==1 and len(skins[0]['joints'])>=50
        assert {'hand_l','hand_r','thumb_l_1','index_l_1','middle_l_1','ring_l_1','pinky_l_1'} <= names
        assert {'Idle','Walk','Repair','Board'} <= set(animations)
        for mesh in doc['meshes']:
            for prim in mesh['primitives']:
                assert {'JOINTS_0','WEIGHTS_0'} <= set(prim['attributes'])
    if path.name=='service-vehicle.glb':
        assert {'door_left_pivot','door_right_pivot'} <= names
    return {'file':path.name,'bytes':len(data),'meshes':len(doc.get('meshes',[])),'nodes':len(doc.get('nodes',[])),
            'skins':len(skins),'animations':animations,
            'joints':len(skins[0].get('joints',[])) if skins else 0,
            'doors':[n['name'] for n in doc['nodes'] if n.get('name','').startswith('door_') and n['name'].endswith('_pivot')]}

if __name__=='__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name,g in [('service-vehicle.glb',vehicle_asset()),('robot-technician.glb',robot_asset('technician')),('robot-assistant.glb',robot_asset('assistant'))]:
        path=OUT/name; size=g.write(path); print(validate(path)); compressed=path.with_suffix(path.suffix+'.gz'); compressed.write_bytes(gzip.compress(path.read_bytes(), compresslevel=9, mtime=0)); print({'gzip':compressed.name,'bytes':compressed.stat().st_size})
