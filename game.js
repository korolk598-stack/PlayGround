import * as THREE from 'three';

/* ============================================================
   أبطال العراق: معركة الكرامة — لعبة إطلاق نار 3D كاملة
   Iraqi Army vs Terrorists — full Arabic mobile+desktop FPS
   ============================================================ */

const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const randi = (a,b)=>Math.floor(rand(a,b+1));
const dist2D = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// ---------- الحفظ ----------
const SAVE_KEY='iraq_heroes_save_v1';
let save={best:0,kills:0,unlocked:1,stars:{},medals:0};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s)save={...save,...s};}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}

// ---------- الإعدادات ----------
const settings={quality:localStorage.getItem('ih_q')||'medium',sens:parseFloat(localStorage.getItem('ih_s')||'1'),sound:localStorage.getItem('ih_m')!=='0',shake:localStorage.getItem('ih_sh')!=='0'};

// ---------- المهام ----------
const MISSIONS=[
 {name:'دفاع بغداد',icon:'🌆',desc:'الإرهابيون يهاجمون أطراف بغداد! اصمد مع إخوانك الجنود وادحر الموجات الثلاث الأولى.',obj:'🎯 اقضِ على 3 موجات من الأعداء',waves:3,baseCount:5},
 {name:'تحرير الفلوجة',icon:'🕌',desc:'تقدم نحو الفلوجة! العدو يتحصن بين الأنقاض ومعه قناصة ومسلحون.',obj:'🎯 اقضِ على 4 موجات — احذر القناصة',waves:4,baseCount:7},
 {name:'معركة الموصل',icon:'🏙️',desc:'أم المعارك! أعداد كبيرة وانتحاريون يحاولون اختراق خطوطنا.',obj:'🎯 اصمد 5 موجات — انتبه للانتحاريين 💥',waves:5,baseCount:8},
 {name:'صحراء الأنبار',icon:'🏜️',desc:'كمائن في الصحراء المفتوحة. العدو سريع والرؤية صعبة مع العواصف الرملية.',obj:'🎯 اقضِ على 5 موجات في الصحراء',waves:5,baseCount:10},
 {name:'النصر الأخير',icon:'🏆',desc:'المعركة الفاصلة! قائد الإرهابيين مع نخبته يدافع عن آخر معاقله. العراق بانتظار نصرك!',obj:'🎯 اهزم القائد وجيشه — 6 موجات',waves:6,baseCount:9,boss:true},
];
const ENEMY_TYPES={
 thug:{name:'مهاجم',hp:50,speed:4.2,dmg:9,score:100,color:0x3b2f2f,headband:0x111111,gun:false},
 gunman:{name:'مسلح',hp:80,speed:3.2,dmg:8,score:150,color:0x2a2a35,headband:0xcc0000,gun:true},
 sniper:{name:'قناص',hp:60,speed:2.6,dmg:25,score:250,color:0x3a3a28,headband:0x228822,gun:true,range:60},
 bomber:{name:'انتحاري 💥',hp:40,speed:5.5,dmg:45,score:200,color:0x4a1a1a,headband:0xff5500,gun:false,suicide:true},
 boss:{name:'القائد الإرهابي 👹',hp:600,speed:2.8,dmg:20,score:2000,color:0x1a1a1a,headband:0xff0000,gun:true,big:true},
};

// ---------- الصوت (تخليقي) ----------
let AC=null;
function audio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function beep(freq,dur,type='square',vol=0.2,slide=0){if(!settings.sound)return;const ac=audio();if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),ac.currentTime+dur);g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);}catch(e){}}
function noiseBurst(dur=0.2,vol=0.4,low=400){if(!settings.sound)return;const ac=audio();if(!ac)return;try{const n=ac.sampleRate*dur,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=ac.createBufferSource();s.buffer=b;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=low;const g=ac.createGain();g.gain.value=vol;s.connect(f);f.connect(g);g.connect(ac.destination);s.start();}catch(e){}}
const SFX={
 shot(){noiseBurst(0.15,0.5,2500);beep(180,0.12,'square',0.25,-120);},
 enemyShot(){noiseBurst(0.1,0.25,1200);beep(140,0.1,'square',0.15,-60);},
 reload(){beep(500,0.08,'square',0.15);setTimeout(()=>beep(700,0.08,'square',0.15),120);setTimeout(()=>beep(900,0.1,'square',0.2),260);},
 hit(){beep(1200,0.06,'square',0.2);},
 kill(){beep(600,0.1,'square',0.25,300);setTimeout(()=>beep(900,0.15,'square',0.25,300),90);},
 hurt(){beep(110,0.25,'sawtooth',0.35,-40);noiseBurst(0.15,0.3,500);},
 explosion(){noiseBurst(0.8,0.7,300);beep(60,0.7,'sawtooth',0.4,-30);},
 pickup(){beep(700,0.1,'sine',0.25,400);},
 wave(){beep(392,0.2,'square',0.25);setTimeout(()=>beep(523,0.2,'square',0.25),180);setTimeout(()=>beep(659,0.35,'square',0.3),360);},
 win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.3,'square',0.25),i*200));},
 lose(){[400,350,300,200].forEach((f,i)=>setTimeout(()=>beep(f,0.3,'sawtooth',0.25),i*220));},
 click(){beep(800,0.05,'square',0.15);},
 empty(){beep(200,0.05,'square',0.15);},
 grenade(){beep(300,0.3,'sine',0.25,200);},
};

// ---------- واجهة ----------
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)$(id).classList.add('active');}
function toast(msg,ms=2200){const t=$('toast');t.textContent=msg;t.style.display='block';clearTimeout(t._tm);t._tm=setTimeout(()=>t.style.display='none',ms);}
function banner(el,txt){const b=$(el);b.textContent=txt;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');}
function refreshMenu(){$('menu-best').textContent=save.best;$('menu-kills').textContent=save.kills;$('menu-medals').textContent=Object.keys(save.stars).length+'/5';$('mission-progress-label').textContent='('+save.unlocked+'/5)';buildMissionGrid();}
function buildMissionGrid(){
 const g=$('mission-grid');g.innerHTML='';
 MISSIONS.forEach((m,i)=>{
  const un=i<save.unlocked, st=save.stars[i+1]||0;
  const d=document.createElement('div');d.className='mission-card '+(un?'unlocked':'locked');
  d.innerHTML=`<div class="mnum">${un?m.icon:'🔒'}</div><div><b>${i+1}. ${m.name}</b><p>${m.desc}</p><div class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)} ${m.waves} موجات</div></div>`;
  if(un)d.onclick=()=>{SFX.click();openBrief(i);};
  g.appendChild(d);
 });
}

// ============================================================
//  محرك اللعبة ثلاثي الأبعاد
// ============================================================
let renderer,scene,camera,clock;
let player,weaponRig,muzzleFlash,muzzleLight;
let enemies=[],allies=[],pickups=[],particles=[],tracers=[],grenadesThrown=[],enemyBullets=[];
let buildings=[],colliders=[];
let flags=[];
let game={state:'menu',mission:0,wave:0,score:0,kills:0,shots:0,hits:0,time:0,waveTotal:0,waveSpawned:0,spawnQueue:[],spawnTimer:0,bossSpawned:false,paused:false,over:false};
let keys={};
let yaw=0,pitch=0,adsAmt=0,firing=false,lastShot=0,reloading=false,reloadEnd=0,nextEnemyShot={};
let touch={active:false,joy:{x:0,y:0},lookId:null,lastLX:0,lastLY:0,fire:false,ads:false};
let shakeAmt=0;
let sandstorm=null;

function makeCanvasTex(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}

function initThree(){
 renderer=new THREE.WebGLRenderer({antialias:settings.quality!=='low',powerPreference:'high-performance'});
 renderer.setSize(innerWidth,innerHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?2:settings.quality==='medium'?1.5:1));
 renderer.shadowMap.enabled=settings.quality!=='low';
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 $('game-root').appendChild(renderer.domElement);
 scene=new THREE.Scene();
 scene.background=new THREE.Color(0x87b5e0);
 scene.fog=new THREE.Fog(0xd8c49a,60,260);
 camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,600);
 clock=new THREE.Clock();
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 buildLights();buildSky();buildGround();buildCity();buildPalms();buildMosque();buildVehicles();buildSandbags();buildFlags();buildWeapon();
 window.addEventListener('pointerlockchange',()=>{});
}

function buildLights(){
 const hemi=new THREE.HemisphereLight(0xbdd7ff,0xc2a06b,0.9);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xfff2d9,2.0);
 sun.position.set(60,90,30);sun.castShadow=settings.quality!=='low';
 sun.shadow.mapSize.set(settings.quality==='high'?2048:1024,settings.quality==='high'?2048:1024);
 sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.far=300;
 scene.add(sun);scene.userData.sun=sun;
}

function buildSky(){
 const skyGeo=new THREE.SphereGeometry(500,16,12);
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{top:{value:new THREE.Color(0x2f6fd0)},mid:{value:new THREE.Color(0x87b5e0)},bot:{value:new THREE.Color(0xf2d8a0)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top,mid,bot;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=h>0.25?mix(mid,top,smoothstep(.25,.9,h)):mix(bot,mid,smoothstep(-.05,.25,h));gl_FragColor=vec4(c,1.);}'});
 scene.add(new THREE.Mesh(skyGeo,skyMat));
 const sunBall=new THREE.Mesh(new THREE.SphereGeometry(18,16,16),new THREE.MeshBasicMaterial({color:0xfff6c9,fog:false}));
 sunBall.position.set(280,230,120);scene.add(sunBall);
 // غيوم
 const cm=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.85});
 for(let i=0;i<10;i++){const g=new THREE.Group();for(let j=0;j<4;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(rand(6,12),8,8),cm);s.position.set(j*rand(6,10)-15,rand(-2,2),rand(-4,4));s.scale.y=0.45;g.add(s);}g.position.set(rand(-350,350),rand(90,160),rand(-350,150));scene.add(g);}
}

function buildGround(){
 const tex=makeCanvasTex((ctx,w,h)=>{ctx.fillStyle='#cfa96b';ctx.fillRect(0,0,w,h);for(let i=0;i<2500;i++){ctx.fillStyle=`rgba(${randi(140,200)},${randi(110,160)},${randi(70,110)},0.5)`;ctx.fillRect(Math.random()*w,Math.random()*h,2,2);}for(let i=0;i<40;i++){ctx.strokeStyle='rgba(120,90,50,.25)';ctx.beginPath();const y=Math.random()*h;ctx.moveTo(0,y);ctx.bezierCurveTo(w*.3,y+10,w*.6,y-10,w,y);ctx.stroke();}});
 tex.repeat.set(24,24);
 const g=new THREE.Mesh(new THREE.PlaneGeometry(600,600,48,48),new THREE.MeshStandardMaterial({map:tex,roughness:1}));
 // كثبان
 const pos=g.geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);const d=Math.hypot(x,y);if(d>40)pos.setZ(i,Math.sin(x*0.05)*Math.cos(y*0.05)*2.2+rand(-0.3,0.3));}
 g.geometry.computeVertexNormals();g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
 // طريق
 const road=new THREE.Mesh(new THREE.PlaneGeometry(14,600),new THREE.MeshStandardMaterial({color:0x3d3d42,roughness:0.95}));
 road.rotation.x=-Math.PI/2;road.position.y=0.06;road.position.x=18;road.receiveShadow=true;scene.add(road);
 for(let z=-290;z<290;z+=12){const line=new THREE.Mesh(new THREE.PlaneGeometry(0.6,5),new THREE.MeshBasicMaterial({color:0xf5d020}));line.rotation.x=-Math.PI/2;line.position.set(18,0.09,z);scene.add(line);}
}

function box(w,h,d,c,x=0,y=0,z=0,rough=0.9){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:rough}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}

function buildCity(){
 const wallCols=[0xb8a88e,0xa89a80,0xc0b49a,0x9a8f78];
 const spots=[[-40,-30],[-55,10],[-35,45],[45,-45],[55,-5],[40,35],[-10,-60],[60,60],[-70,-60],[0,70],[-15,20],[30,-10]];
 spots.forEach(([x,z],idx)=>{
  const w=rand(10,18),d=rand(10,18),h=rand(7,16);
  const c=wallCols[idx%wallCols.length];
  const grp=new THREE.Group();
  const main=box(w,h,d,c,0,h/2,0);grp.add(main);
  // ثقوب معركة: نوافذ سوداء
  const winM=new THREE.MeshBasicMaterial({color:0x1a1410});
  for(let wy=2.5;wy<h-1;wy+=2.6)for(let wx=-w/2+1.5;wx<w/2-1;wx+=2.6){if(Math.random()<0.5)continue;const win=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.4),winM);win.position.set(wx,wy,d/2+0.02);grp.add(win);}
  // حطام علوي
  if(Math.random()<0.7){const r=box(rand(3,6),rand(1,2.5),rand(2,4),0x8a7a64,rand(-w/4,w/4),h+0.5,rand(-d/4,d/4));r.rotation.y=rand(0,1);grp.add(r);}
  // أنقاض
  for(let i=0;i<4;i++)grp.add(box(rand(0.6,1.6),rand(0.4,1),rand(0.6,1.6),0x8a7f6a,rand(-w/2-3,w/2+3),0.3,rand(-d/2-3,d/2+3)));
  grp.position.set(x,0,z);grp.rotation.y=rand(-0.15,0.15);scene.add(grp);
  colliders.push({x,z,hw:w/2+0.5,hd:d/2+0.5});
  buildings.push(grp);
 });
 // براميل متفجرة
 for(let i=0;i<10;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,1.4,10),new THREE.MeshStandardMaterial({color:i%2?0xaa2222:0x336622,roughness:0.6}));b.position.set(rand(-70,70),0.7,rand(-70,70));if(Math.abs(b.position.x-18)<4)b.position.x+=8;b.castShadow=true;scene.add(b);b.userData.barrel=true;buildings.push((()=>{const g=new THREE.Group();g.add(b);return g;})());b.userData.hp=30;pickups.push({mesh:b,type:'barrel',x:b.position.x,z:b.position.z,hp:30});}
}

function buildPalms(){
 const trunkM=new THREE.MeshStandardMaterial({color:0x6b4a2b,roughness:1});
 const leafM=new THREE.MeshStandardMaterial({color:0x2f7a33,roughness:0.9,side:THREE.DoubleSide});
 for(let i=0;i<26;i++){
  const g=new THREE.Group();const h=rand(5,8);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,h,7),trunkM);trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  for(let k=0;k<7;k++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.9),leafM);leaf.position.y=h+0.2;leaf.rotation.y=k/7*Math.PI*2;leaf.rotation.z=0.35;leaf.translateX(1.5);leaf.castShadow=true;g.add(leaf);}
  const a=rand(0,Math.PI*2),r=rand(45,110);
  let px2=Math.cos(a)*r, pz2=Math.sin(a)*r;
  if(Math.abs(px2-18)<7)px2+=14;
  if(Math.hypot(px2-0,pz2-16)<16){px2+=px2>=0?16:-16;} // إبعاد النخيل عن نقطة الإنزال
  g.position.set(px2,0,pz2);
  g.rotation.y=rand(0,6);scene.add(g);
 }
}

function buildMosque(){
 const g=new THREE.Group();
 const base=box(16,8,16,0xd8cfae,0,4,0);g.add(base);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(5,20,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x2a9db8,roughness:0.35,metalness:0.4}));
 dome.position.y=8;dome.castShadow=true;g.add(dome);
 const cres=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.18,8,16),new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8,roughness:0.3}));
 cres.position.y=14.5;g.add(cres);
 [[-7,-7],[7,-7],[-7,7],[7,7]].forEach(([x,z])=>{const mn=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,20,8),new THREE.MeshStandardMaterial({color:0xe4dcc2}));mn.position.set(x,10,z);mn.castShadow=true;g.add(mn);const top=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.5,8),new THREE.MeshStandardMaterial({color:0x2a9db8}));top.position.set(x,21,z);g.add(top);});
 g.position.set(-30,0,-75);scene.add(g);colliders.push({x:-30,z:-75,hw:9,hd:9});
}

function buildVehicles(){
 // دبابة عراقية
 const tank=new THREE.Group();
 const hullM=new THREE.MeshStandardMaterial({color:0x5a6b3a,roughness:0.7,metalness:0.3});
 const hull=new THREE.Mesh(new THREE.BoxGeometry(3.4,1,6),hullM);hull.position.y=1;hull.castShadow=true;tank.add(hull);
 const tur=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.8,2.6),hullM);tur.position.set(0,1.8,-0.4);tur.castShadow=true;tank.add(tur);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,4.4,10),new THREE.MeshStandardMaterial({color:0x3a4526}));barrel.rotation.x=Math.PI/2;barrel.position.set(0,1.9,-3.4);tank.add(barrel);
 const flagPole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4),new THREE.MeshStandardMaterial({color:0x888888}));flagPole.position.set(-1,3,0.6);tank.add(flagPole);
 const fl=makeIraqiFlagMesh();fl.position.set(-1,3.8,0.6);fl.scale.setScalar(0.9);tank.add(fl);
 [[-1.9],[1.9]].forEach(([x])=>{const tr=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,6.2),new THREE.MeshStandardMaterial({color:0x2e2e28,roughness:1}));tr.position.set(x,0.55,0);tank.add(tr);});
 tank.position.set(8,0,20);tank.rotation.y=0.5;scene.add(tank);colliders.push({x:8,z:20,hw:2.5,hd:3.5});
 // همفي
 const hum=new THREE.Group();
 const hb=box(2.2,1,4.4,0x6a7a4a,0,1.1,0);hum.add(hb);
 hum.add(box(2,0.8,2.4,0x57653c,0,2,0.3));
 [[-1.1,1.4],[1.1,1.4],[-1.1,-1.4],[1.1,-1.4]].forEach(([x,z])=>{const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.4,12),new THREE.MeshStandardMaterial({color:0x1a1a1a}));wh.rotation.z=Math.PI/2;wh.position.set(x,0.5,z);hum.add(wh);});
 hum.position.set(-8,0,26);hum.rotation.y=-0.4;scene.add(hum);colliders.push({x:-8,z:26,hw:1.6,hd:2.6});
}

function buildSandbags(){
 const m=new THREE.MeshStandardMaterial({color:0x9a8a5f,roughness:1});
 [[0,12],[3,12],[-3,12],[0,12.8]].forEach(([x,z])=>{const s=new THREE.Mesh(new THREE.SphereGeometry(0.55,8,6),m);s.scale.set(1.2,0.55,0.8);s.position.set(x,0.3,z);s.castShadow=true;scene.add(s);});
 colliders.push({x:0,z:12,hw:3.4,hd:1});
}

function makeIraqiFlagMesh(){
 const c=document.createElement('canvas');c.width=128;c.height=86;const x=c.getContext('2d');
 x.fillStyle='#ce1126';x.fillRect(0,0,128,29);x.fillStyle='#fff';x.fillRect(0,29,128,28);x.fillStyle='#000';x.fillRect(0,57,128,29);
 x.fillStyle='#007a3d';x.font='bold 20px sans-serif';x.textAlign='center';x.fillText('الله أكبر',64,52);
 const t=new THREE.CanvasTexture(c);
 const geo=new THREE.PlaneGeometry(3,2,8,1);
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide}));
 mesh.userData.base=geo.attributes.position.array.slice();
 flags.push(mesh);return mesh;
}
function buildFlags(){
 [[-9,17],[9,17],[25,-20]].forEach(([x,z])=>{
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,7),new THREE.MeshStandardMaterial({color:0xcccccc,metalness:0.6}));pole.position.set(x,3.5,z);scene.add(pole);
  const f=makeIraqiFlagMesh();f.position.set(x+1.55,5.8,z);scene.add(f);
 });
}

function buildWeapon(){
 weaponRig=new THREE.Group();camera.add(weaponRig);scene.add(camera);
 const metal=new THREE.MeshStandardMaterial({color:0x2b2b30,roughness:0.45,metalness:0.6});
 const wood=new THREE.MeshStandardMaterial({color:0x6e4a22,roughness:0.8});
 const body=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.13,0.75),metal);weaponRig.add(body);
 const stock=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.11,0.3),wood);stock.position.set(0,-0.02,0.5);weaponRig.add(stock);
 const grip=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.16,0.09),wood);grip.position.set(0,-0.12,0.12);grip.rotation.x=0.3;weaponRig.add(grip);
 const mag=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.2,0.1),metal);mag.position.set(0,-0.14,-0.02);mag.rotation.x=0.25;weaponRig.add(mag);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.4,8),metal);barrel.rotation.x=Math.PI/2;barrel.position.set(0,0.02,-0.55);weaponRig.add(barrel);
 const sight=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.06,0.05),metal);sight.position.set(0,0.1,-0.1);weaponRig.add(sight);
 // علم صغير على السلاح 🇮🇶
 const patch=new THREE.Mesh(new THREE.PlaneGeometry(0.09,0.06),new THREE.MeshBasicMaterial({color:0xce1126}));patch.position.set(0.048,0.02,0.2);patch.rotation.y=Math.PI/2;weaponRig.add(patch);
 muzzleFlash=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.35,8),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:0}));
 muzzleFlash.rotation.x=-Math.PI/2;muzzleFlash.position.set(0,0.02,-0.8);weaponRig.add(muzzleFlash);
 muzzleLight=new THREE.PointLight(0xffb84d,0,12);muzzleLight.position.set(0,0,-0.8);weaponRig.add(muzzleLight);
 weaponRig.position.set(0.25,-0.24,-0.6);
 weaponRig.scale.setScalar(0.8);
 weaponRig.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
}

// ---------- اللاعب ----------
function resetPlayer(){
 player={x:0,z:16,hp:100,maxHp:100,armor:0,ammo:30,reserve:120,grenades:3,speed:8,alive:true,regenT:0};
 yaw=0;pitch=0; // مواجهة الشمال (الأعداء)
 firing=false;reloading=false;adsAmt=0;shakeAmt=0;
}

// ---------- الأعداء ----------
function makeHumanoid(type){
 const T=ENEMY_TYPES[type];
 const g=new THREE.Group();
 const s=T.big?1.5:1;
 const skin=new THREE.MeshStandardMaterial({color:0xc9986b,roughness:0.8});
 const cloth=new THREE.MeshStandardMaterial({color:T.color,roughness:0.95});
 const legL=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.8*s,0.22*s),cloth);legL.position.set(-0.14*s,0.4*s,0);
 const legR=legL.clone();legR.position.x=0.14*s;
 const torso=new THREE.Mesh(new THREE.BoxGeometry(0.55*s,0.75*s,0.32*s),cloth);torso.position.y=1.15*s;
 const vest=new THREE.Mesh(new THREE.BoxGeometry(0.6*s,0.4*s,0.38*s),new THREE.MeshStandardMaterial({color:0x222222}));vest.position.y=1.2*s;
 const armL=new THREE.Mesh(new THREE.BoxGeometry(0.16*s,0.7*s,0.16*s),cloth);armL.position.set(-0.38*s,1.15*s,0);
 const armR=armL.clone();armR.position.x=0.38*s;
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.2*s,10,10),skin);head.position.y=1.78*s;
 const band=new THREE.Mesh(new THREE.CylinderGeometry(0.21*s,0.21*s,0.09*s,10),new THREE.MeshStandardMaterial({color:T.headband}));band.position.y=1.86*s;
 const beard=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.15*s,0.05*s),new THREE.MeshStandardMaterial({color:0x1a1a1a}));beard.position.set(0,1.68*s,0.17*s);
 g.add(legL,legR,torso,vest,armL,armR,head,band,beard);
 let gun=null;
 if(T.gun){gun=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.1,0.9),new THREE.MeshStandardMaterial({color:0x111111}));gun.position.set(0.38*s,1.2*s,-0.4);g.add(gun);}
 if(type==='bomber'){const vest2=new THREE.Mesh(new THREE.BoxGeometry(0.65*s,0.5*s,0.42*s),new THREE.MeshStandardMaterial({color:0xff3300,emissive:0x550000}));vest2.position.y=1.2*s;g.add(vest2);}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
 // شريط صحة
 const hpBar=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.1),new THREE.MeshBasicMaterial({color:0x33ff33,depthTest:false}));
 hpBar.position.y=2.25*s;g.add(hpBar);
 return {group:g,legL,legR,armL,armR,head,hpBar,gun};
}
function spawnEnemy(forceType){
 const m=MISSIONS[game.mission];
 let type=forceType;
 if(!type){
  const r=Math.random(),w=game.wave;
  if(game.mission===4&&!game.bossSpawned&&game.wave===m.waves&&game.waveSpawned>=game.waveTotal-1){type='boss';game.bossSpawned=true;}
  else if(r<0.4)type='thug';
  else if(r<0.7)type='gunman';
  else if(r<0.82)type='sniper';
  else if(r<0.93||w>=3)type='bomber';
  else type='gunman';
  if(game.mission===0&&game.wave===1&&Math.random()<0.7)type='thug';
 }
 const T=ENEMY_TYPES[type];
 const parts=makeHumanoid(type);
 // نقطة ظهور على الأطراف
 const a=rand(0,Math.PI*2);
 let x=clamp(Math.cos(a)*rand(45,75),-80,80),z=clamp(Math.sin(a)*rand(45,75)-20,-85,80);
 if(Math.abs(x-18)<5)x+=10;
 parts.group.position.set(x,0,z);
 scene.add(parts.group);
 const hpMul=1+(game.mission*0.15)+(game.wave*0.1);
 const e={type,T,parts,x,z,hp:T.hp*hpMul,maxHp:T.hp*hpMul,walkPh:rand(0,6),attackT:rand(1,2.5),dead:false,deathT:0,shootT:rand(1,3)};
 enemies.push(e);
 return e;
}

function spawnAlly(i){
 const g=new THREE.Group();
 const uni=new THREE.MeshStandardMaterial({color:0x4a5d3a,roughness:0.9});
 const skin=new THREE.MeshStandardMaterial({color:0xc9986b});
 const torso=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.75,0.32),uni);torso.position.y=1.15;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,10),skin);head.position.y=1.78;g.add(head);
 const helm=new THREE.Mesh(new THREE.SphereGeometry(0.23,10,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x3d4d2e}));helm.position.y=1.82;g.add(helm);
 const legL=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.8,0.22),uni);legL.position.set(-0.14,0.4,0);g.add(legL);
 const legR=legL.clone();legR.position.x=0.14;g.add(legR);
 const gun=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.1,0.9),new THREE.MeshStandardMaterial({color:0x222222}));gun.position.set(0.3,1.2,-0.4);g.add(gun);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 const spots=[[-4,14],[4,14],[-6,18]];
 g.position.set(spots[i%3][0],0,spots[i%3][1]);
 scene.add(g);
 allies.push({group:g,legL,legR,shootT:rand(1,3),ph:rand(0,6)});
}

// ---------- جزيئات ----------
function spawnParticle(x,y,z,color,size=0.15,life=0.7,vel=null){
 const geo=new THREE.SphereGeometry(size,6,6);
 const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
 m.position.set(x,y,z);
 scene.add(m);
 particles.push({mesh:m,life,maxLife:life,vel:vel||{x:rand(-3,3),y:rand(1,6),z:rand(-3,3)},grav:-9});
}
function blood(x,y,z){for(let i=0;i<8;i++)spawnParticle(x+rand(-.2,.2),y+rand(-.2,.2),z+rand(-.2,.2),0x8a0f0f,0.09,0.6);}
function dust(x,y,z){for(let i=0;i<6;i++)spawnParticle(x,y+0.1,z,0xcbb27f,0.14,0.8);}
function explosionFX(x,y,z,big=false){
 const n=big?30:16;
 for(let i=0;i<n;i++)spawnParticle(x,y+0.5,z,i%3?0xff7722:0x333333,rand(0.15,0.4),rand(0.5,1.2));
 const light=new THREE.PointLight(0xff7733,60,30);light.position.set(x,2,z);scene.add(light);
 particles.push({mesh:light,life:0.3,maxLife:0.3,vel:{x:0,y:0,z:0},grav:0,light:true});
 SFX.explosion();shakeAmt=Math.min(1,shakeAmt+(big?0.8:0.45));
}
function tracer(from,to,color=0xffe27a){
 const geo=new THREE.BufferGeometry().setFromPoints([from,to]);
 const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:0.95}));
 scene.add(line);tracers.push({mesh:line,life:0.08});
}

// ---------- التقاطات ----------
function dropPickup(x,z){
 const r=Math.random();
 const type=r<0.4?'med':r<0.7?'ammo':r<0.85?'armor':'nade';
 const color=type==='med'?0xff2222:type==='ammo'?0xffcc00:type==='armor'?0x3399ff:0x33cc44;
 const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.4}));
 if(type==='med'){const c1=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.12,0.12),new THREE.MeshBasicMaterial({color:0xffffff}));const c2=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.4,0.12),new THREE.MeshBasicMaterial({color:0xffffff}));c1.position.y=0.31;c2.position.y=0.31;m.add(c1,c2);}
 m.position.set(x,0.5,z);scene.add(m);
 pickups.push({mesh:m,type,x,z,life:25});
}

// ---------- بدء مهمة ----------
function startMission(idx){
 game.mission=idx;game.wave=0;game.score=0;game.kills=0;game.shots=0;game.hits=0;game.time=0;
 game.over=false;game.paused=false;game.bossSpawned=false;
 resetPlayer();
 clearField();
 for(let i=0;i<2;i++)spawnAlly(i);
 $('hud').classList.remove('hidden');
 nextWave();
 game.state='playing';
 show(null);
 toast('الله يحميك يا بطل! 🇮🇶');
}
function clearField(){
 [...enemies].forEach(e=>scene.remove(e.parts.group));enemies=[];
 [...allies].forEach(a=>scene.remove(a.group));allies=[];
 pickups.filter(p=>p.mesh).forEach(p=>scene.remove(p.mesh));
 pickups=pickups.filter(p=>p.type==='barrel');
 particles.forEach(p=>scene.remove(p.mesh));particles=[];
 tracers.forEach(t=>scene.remove(t.mesh));tracers=[];
 grenadesThrown.forEach(g=>scene.remove(g.mesh));grenadesThrown=[];
}
function nextWave(){
 game.wave++;
 const m=MISSIONS[game.mission];
 const count=Math.min(m.baseCount+game.wave*3,22);
 game.waveTotal=count;game.waveSpawned=0;game.spawnQueue=[];
 for(let i=0;i<count;i++)game.spawnQueue.push(null);
 game.spawnTimer=0;
 banner('wave-banner',`🌊 الموجة ${game.wave} من ${m.waves}`);
 SFX.wave();
 updateHUD();
}
function openBrief(i){
 $('brief-title').textContent=`${MISSIONS[i].icon} المهمة ${i+1}: ${MISSIONS[i].name}`;
 $('brief-desc').textContent=MISSIONS[i].desc;
 $('brief-obj').textContent=MISSIONS[i].obj;
 game.pendingMission=i;
 show('brief-screen');
}

// ---------- إطلاق نار ----------
function tryShoot(){
 if(game.state!=='playing'||game.paused||game.over||!player.alive||reloading)return;
 const now=performance.now()/1000;
 if(now-lastShot<0.13)return;
 if(player.ammo<=0){SFX.empty();startReload();return;}
 lastShot=now;player.ammo--;game.shots++;
 SFX.shot();
 // وميض
 muzzleFlash.material.opacity=1;muzzleLight.intensity=25;
 setTimeout(()=>{muzzleFlash.material.opacity=0;muzzleLight.intensity=0;},50);
 // ارتداد
 pitch=clamp(pitch+rand(0.004,0.01)*(adsAmt>0.5?0.5:1),-1.4,1.4);
 shakeAmt=Math.min(0.5,shakeAmt+0.06);
 $('crosshair').classList.add('fire');setTimeout(()=>$('crosshair').classList.remove('fire'),80);
 // raycast
 const spread=(adsAmt>0.5?0.004:0.02)+(firing?0.008:0);
 const dir=new THREE.Vector3(rand(-spread,spread),rand(-spread,spread),-1).normalize().applyQuaternion(camera.quaternion);
 const origin=camera.getWorldPosition(new THREE.Vector3());
 const rc=new THREE.Raycaster(origin,dir,0.1,160);
 const targets=[];
 enemies.forEach(e=>{if(!e.dead)e.parts.group.traverse(o=>{if(o.isMesh&&o!==e.parts.hpBar)targets.push(o);});});
 pickups.forEach(p=>{if(p.type==='barrel')targets.push(p.mesh);});
 const hits=rc.intersectObjects(targets,false);
 const end=hits.length?hits[0].point:origin.clone().add(dir.multiplyScalar(120));
 tracer(camera.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,-0.15,0)),end);
 // غلاف رصاصة
 spawnParticle(origin.x,origin.y-0.2,origin.z,0xd4af37,0.05,0.4,{x:2,y:1,z:0});
 if(hits.length){
  const h=hits[0];
  // برميل؟
  const barrel=pickups.find(p=>p.type==='barrel'&&p.mesh===h.object);
  if(barrel){barrel.hp-=34;if(barrel.hp<=0)detonateBarrel(barrel);else dust(h.point.x,h.point.y,h.point.z);}
  else{
   const e=enemies.find(e=>{let f=false;e.parts.group.traverse(o=>{if(o===h.object)f=true;});return f;});
   if(e&&!e.dead){
    game.hits++;
    const headshot=h.object===e.parts.head;
    const dmg=(headshot?70:34)*(adsAmt>0.5?1.2:1);
    e.hp-=dmg;blood(h.point.x,h.point.y,h.point.z);
    $('hitmarker').classList.remove('show');void $('hitmarker').offsetWidth;$('hitmarker').classList.add('show');
    SFX.hit();
    e.parts.hpBar.material.color.setHex(e.hp/e.maxHp>0.5?0x33ff33:e.hp/e.maxHp>0.25?0xffaa00:0xff2222);
    e.parts.hpBar.scale.x=clamp(e.hp/e.maxHp,0.05,1);
    // استفزاز العدو
    e.aggro=true;
    if(e.hp<=0)killEnemy(e,headshot);
   }
  }
 }else{
  dust(end.x,Math.max(0.2,end.y),end.z);
 }
 if(player.ammo===0)startReload();
 updateHUD();
}
function detonateBarrel(b){
 explosionFX(b.mesh.position.x,0.5,b.mesh.position.z);
 scene.remove(b.mesh);
 pickups.splice(pickups.indexOf(b),1);
 enemies.forEach(e=>{if(!e.dead&&Math.hypot(e.x-b.mesh.position.x,e.z-b.mesh.position.z)<9){e.hp-=120;blood(e.x,1.2,e.z);if(e.hp<=0)killEnemy(e,false);}});
 if(Math.hypot(player.x-b.mesh.position.x,player.z-b.mesh.position.z)<8)damagePlayer(30);
}
function killEnemy(e,headshot){
 if(e.dead)return;e.dead=true;e.deathT=0.8;
 const pts=e.T.score*(headshot?2:1);
 game.score+=pts;game.kills++;save.kills++;
 SFX.kill();
 const kf=document.createElement('div');kf.className='kf';kf.textContent=(headshot?'🎯 إصابة رأس! ':'💀 تم القضاء على ')+e.T.name+` +${pts}`;
 $('killfeed').prepend(kf);setTimeout(()=>kf.remove(),2500);
 while($('killfeed').children.length>3)$('killfeed').lastChild.remove();
 if(e.type==='bomber'&&Math.hypot(e.x-player.x,e.z-player.z)<6){explosionFX(e.x,1,e.z);damagePlayer(25);}
 else blood(e.x,1.2,e.z);
 if(Math.random()<0.28)dropPickup(e.x,e.z);
 if(game.score>save.best){save.best=game.score;persist();}
 updateHUD();checkWaveEnd();
}
function damagePlayer(d){
 if(!player.alive||game.over)return;
 if(player.armor>0){const ab=Math.min(player.armor,d);player.armor-=ab;d-=ab;}
 player.hp-=d;SFX.hurt();
 shakeAmt=Math.min(1,shakeAmt+0.35);
 const dv=$('damage-vignette');dv.classList.add('hit');setTimeout(()=>dv.classList.remove('hit'),200);
 if(player.hp<=0){player.hp=0;player.alive=false;gameOver(false);}
 updateHUD();
}
function throwGrenade(){
 if(player.grenades<=0){toast('لا توجد قنابل! 💣');return;}
 if(game.state!=='playing'||game.paused||game.over)return;
 player.grenades--;SFX.grenade();
 const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:0x224422}));
 mesh.position.copy(camera.getWorldPosition(new THREE.Vector3())).add(dir.clone().multiplyScalar(0.6));
 scene.add(mesh);
 grenadesThrown.push({mesh,vel:{x:dir.x*16,y:dir.y*16+5,z:dir.z*16},t:2.0});
 updateHUD();
}
function startReload(){
 if(reloading||player.ammo>=30||player.reserve<=0)return;
 reloading=true;reloadEnd=performance.now()/1000+1.6;SFX.reload();
 $('reload-hint').style.display='none';
}
function finishReload(){
 const need=30-player.ammo,take=Math.min(need,player.reserve);
 player.ammo+=take;player.reserve-=take;reloading=false;updateHUD();
}

// ---------- الحلفاء ----------
function updateAllies(dt){
 allies.forEach(a=>{
  a.ph+=dt*6;
  a.legL.position.z=Math.sin(a.ph)*0.2;
  // ابحث عن أقرب عدو حي
  let best=null,bd=1e9;
  enemies.forEach(e=>{if(e.dead)return;const d=Math.hypot(e.x-a.group.position.x,e.z-a.group.position.z);if(d<bd){bd=d;best=e;}});
  if(best){
   a.group.lookAt(best.x,0,best.z);
   a.shootT-=dt;
   if(a.shootT<=0&&bd<55){a.shootT=rand(1.2,2.5);
    tracer(a.group.position.clone().add(new THREE.Vector3(0,1.4,0)),new THREE.Vector3(best.x,1.2,best.z),0xaef3ff);
    SFX.enemyShot();
    if(Math.random()<0.45){best.hp-=18;blood(best.x,1.2,best.z);if(best.hp<=0)killEnemy(best,false);}
   }
  }
 });
}

// ---------- تحديث الأعداء ----------
function updateEnemies(dt){
 const m=MISSIONS[game.mission];
 game.spawnTimer-=dt;
 if(game.spawnQueue.length&&game.spawnTimer<=0&&enemies.filter(e=>!e.dead).length<10){
  game.spawnQueue.pop();game.waveSpawned++;
  spawnEnemy();
  game.spawnTimer=Math.max(0.4,1.6-game.wave*0.15-game.mission*0.1);
 }
 enemies.forEach(e=>{
  if(e.dead){e.deathT-=dt;e.parts.group.rotation.x=Math.min(Math.PI/2,e.parts.group.rotation.x+dt*6);e.parts.group.position.y=Math.max(-0.6,e.parts.group.position.y-dt*1.2);if(e.deathT<=0){scene.remove(e.parts.group);}return;}
  const dx=player.x-e.x,dz=player.z-e.z;
  const d=Math.hypot(dx,dz);
  const ang=Math.atan2(dx,dz);
  e.parts.group.rotation.y=ang;
  // حركة المشي
  e.walkPh+=dt*9;
  const sw=Math.sin(e.walkPh)*0.35;
  e.parts.legL.rotation.x=sw;e.parts.legR.rotation.x=-sw;
  e.parts.armL.rotation.x=-sw*0.7;e.parts.armR.rotation.x=sw*0.7;
  e.parts.hpBar.lookAt(camera.position);
  const T=e.T;
  const atkRange=T.suicide?2.2:T.gun?(T.range||28):2.4;
  if(d>atkRange){
   const sp=T.speed*(1+game.wave*0.05);
   let nx=e.x+Math.sin(ang)*sp*dt,nz=e.z+Math.cos(ang)*sp*dt;
   // تصادم بسيط
   let blocked=false;
   for(const c of colliders){if(Math.abs(nx-c.x)<c.hw&&Math.abs(nz-c.z)<c.hd){blocked=true;break;}}
   if(!blocked){e.x=nx;e.z=nz;}
   else{const sa=ang+Math.PI/2;e.x+=Math.sin(sa)*sp*dt*0.7;e.z+=Math.cos(sa)*sp*dt*0.7;}
   e.parts.group.position.set(e.x,0,e.z);
  }else{
   // هجوم
   e.attackT-=dt;
   if(e.attackT<=0){
    if(T.suicide){explosionFX(e.x,1,e.z,true);e.dead=true;e.deathT=0.1;scene.remove(e.parts.group);if(d<7)damagePlayer(T.dmg);game.score+=0;checkWaveEnd();}
    else if(T.gun){
     e.attackT=rand(1.2,2.6)-Math.min(0.6,game.wave*0.06);
     SFX.enemyShot();
     tracer(new THREE.Vector3(e.x,1.5,e.z),new THREE.Vector3(player.x,1.5,player.z),0xff5555);
     const hitCh=clamp(0.34-d*0.008,0.07,0.34);
     if(Math.random()<hitCh)damagePlayer(T.dmg*rand(0.7,1.3));
     else dust(player.x+rand(-1,1),1.5,player.z+rand(-1,1));
    }else{
     e.attackT=1.1;
     e.parts.armR.rotation.x=-2; // ضربة
     if(d<3)damagePlayer(T.dmg);
    }
   }
  }
 });
 enemies=enemies.filter(e=>!(e.dead&&e.deathT<=0));
}
function checkWaveEnd(){
 const alive=enemies.filter(e=>!e.dead).length;
 const remaining=game.spawnQueue.length+(game.waveTotal-game.waveSpawned);
 $('hud-enemies').textContent='☠️ المتبقي: '+(alive+remaining);
 if(alive===0&&remaining<=0&&!game.over){
  const m=MISSIONS[game.mission];
  if(game.wave>=m.waves){gameOver(true);}
  else{setTimeout(()=>{if(!game.over)nextWave();},1800);toast('أحسنت يا بطل! الموجة التالية قادمة... 🎖️');SFX.pickup();}
 }
}

// ---------- نهاية ----------
function gameOver(win){
 if(game.over)return;game.over=true;
 firing=false;
 document.exitPointerLock&&document.exitPointerLock();
 $('hud').classList.add('hidden');
 const acc=game.shots?Math.round(game.hits/game.shots*100):0;
 if(win){
  SFX.win();
  const stars=player.hp>70?3:player.hp>35?2:1;
  const prev=save.stars[game.mission+1]||0;
  save.stars[game.mission+1]=Math.max(prev,stars);
  if(game.mission+1===save.unlocked&&save.unlocked<5)save.unlocked++;
  if(game.score>save.best)save.best=game.score;
  persist();refreshMenu();
  $('end-title').textContent='🏆 النصر! '+MISSIONS[game.mission].name+' تحررت!';
  $('end-medal').textContent=stars===3?'🎖️🎖️🎖️':stars===2?'🎖️🎖️':'🎖️';
  $('end-stats').innerHTML=`النقاط: <b>${game.score}</b> • القتلى: <b>${game.kills}</b> • الدقة: <b>${acc}%</b><br>التقييم: ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`;
  $('btn-next').style.display=(game.mission<4)?'block':'none';
  if(game.mission===4){$('end-title').textContent='🇮🇶 النصر الكامل! تم تحرير العراق!';}
 }else{
  SFX.lose();
  $('end-title').textContent='💔 استشهد البطل...';
  $('end-medal').textContent='🕊️';
  $('end-stats').innerHTML=`وصلت للموجة <b>${game.wave}</b> • النقاط: <b>${game.score}</b> • القتلى: <b>${game.kills}</b><br>حاول مجدداً يا بطل، العراق يحتاجك! 🇮🇶`;
  $('btn-next').style.display='none';
 }
 game.state='ended';
 show('end-screen');
}

// ---------- HUD ----------
function updateHUD(){
 $('hud-mission').textContent=`${MISSIONS[game.mission].icon} ${MISSIONS[game.mission].name}`;
 $('hud-wave').textContent=`الموجة ${game.wave}/${MISSIONS[game.mission].waves}`;
 $('hud-score').textContent='النقاط: '+game.score;
 $('hp-num').textContent=Math.ceil(player.hp);
 $('hp-fill').style.width=clamp(player.hp,0,100)+'%';
 $('hp-fill').style.background=player.hp>60?'linear-gradient(90deg,#16a34a,#4ade80)':player.hp>30?'linear-gradient(90deg,#d97706,#fbbf24)':'linear-gradient(90deg,#dc2626,#f87171)';
 $('ar-num').textContent=Math.ceil(player.armor);
 $('ar-fill').style.width=clamp(player.armor,0,100)+'%';
 $('ammo').textContent=`🔫 ${player.ammo} / ${player.reserve}`;
 $('grenades').textContent=`💣 × ${player.grenades}`;
 $('reload-hint').style.display=(player.ammo<=6&&!reloading)?'block':'none';
 const alive=enemies.filter(e=>!e.dead).length;
 const remaining=game.spawnQueue.length+(game.waveTotal-game.waveSpawned);
 $('hud-enemies').textContent='☠️ المتبقي: '+(alive+remaining);
}

// ---------- خريطة مصغرة ----------
function drawMinimap(){
 const c=$('minimap'),ctx=c.getContext('2d');
 ctx.clearRect(0,0,140,140);
 ctx.fillStyle='rgba(20,30,20,.9)';ctx.beginPath();ctx.arc(70,70,68,0,7);ctx.fill();
 const px=x=>70+x*0.8, pz=z=>70+z*0.8;
 // مباني
 ctx.fillStyle='#6b5d43';
 colliders.forEach(b=>{ctx.fillRect(px(b.x-b.hw),pz(b.z-b.hd),b.hw*1.6,b.hd*1.6);});
 // تقاطات
 pickups.forEach(p=>{if(p.type==='barrel')return;ctx.fillStyle=p.type==='med'?'#f33':p.type==='ammo'?'#fc0':'#3cf';ctx.fillRect(px(p.x)-2,pz(p.z)-2,4,4);});
 // أعداء
 enemies.forEach(e=>{if(e.dead)return;ctx.fillStyle=e.type==='boss'?'#f0f':'#f33';ctx.beginPath();ctx.arc(px(e.x),pz(e.z),e.type==='boss'?5:3,0,7);ctx.fill();});
 // حلفاء
 ctx.fillStyle='#4f4';allies.forEach(a=>{ctx.beginPath();ctx.arc(px(a.group.position.x),pz(a.group.position.z),3,0,7);ctx.fill();});
 // لاعب
 ctx.save();ctx.translate(70,70);ctx.rotate(Math.atan2(Math.sin(yaw),Math.cos(yaw))+Math.PI);
 ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();
}

// ---------- تحكم ----------
function collide(nx,nz){
 if(Math.hypot(nx,nz)>88)return true;
 for(const c of colliders){if(Math.abs(nx-c.x)<c.hw+0.5&&Math.abs(nz-c.z)<c.hd+0.5)return true;}
 return false;
}
function updatePlayer(dt){
 if(!player.alive)return;
 let mx=0,mz=0;
 if(keys['KeyW']||keys['ArrowUp'])mz-=1;
 if(keys['KeyS']||keys['ArrowDown'])mz+=1;
 if(keys['KeyA'])mx-=1;
 if(keys['KeyD'])mx+=1;
 mx+=touch.joy.x;mz+=touch.joy.y;
 const running=(keys['ShiftLeft']||keys['ShiftRight'])?1.5:1;
 const len=Math.hypot(mx,mz);
 if(len>1){mx/=len;mz/=len;}
 const wantADS=(keys['Space']&&false)||touch.ads||((firing)&&false);
 const adsTarget=(touch.ads||keys['KeyC'])?1:0;
 adsAmt+=(adsTarget-adsAmt)*dt*8;
 const sp=player.speed*(adsAmt>0.5?0.5:1)*running;
 const sin=Math.sin(yaw),cos=Math.cos(yaw);
 const wx=(mx*cos-mz*sin)*sp*dt, wz=(mx*sin+mz*cos)*sp*dt*-1;
 // تحويل صحيح: أمام = -Z محلي
 const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
 const rx=Math.cos(yaw),rz=-Math.sin(yaw);
 let nx=player.x+(rx*mx+fx*-mz)*sp*dt;
 let nz=player.z+(rz*mx+fz*-mz)*sp*dt;
 if(!collide(nx,player.z))player.x=nx;
 if(!collide(player.x,nz))player.z=nz;
 // قفز بسيط
 if((keys['Space'])&&player.grounded!==false){/* محفوظ للمس */ }
 // التقاط
 pickups.forEach(p=>{
  if(p.type==='barrel')return;
  if(Math.hypot(p.x-player.x,p.z-player.z)<1.4){
   if(p.type==='med'){player.hp=Math.min(player.maxHp,player.hp+40);toast('❤️ إسعافات! +40 صحة');$('heal-flash').style.opacity=1;setTimeout(()=>$('heal-flash').style.opacity=0,500);}
   if(p.type==='ammo'){player.reserve=Math.min(300,player.reserve+60);toast('🔫 ذخيرة! +60');}
   if(p.type==='armor'){player.armor=Math.min(100,player.armor+50);toast('🛡️ درع! +50');}
   if(p.type==='nade'){player.grenades=Math.min(5,player.grenades+1);toast('💣 قنبلة إضافية!');}
   SFX.pickup();scene.remove(p.mesh);pickups.splice(pickups.indexOf(p),1);updateHUD();
  }
 });
 // تجديد خفيف
 player.regenT+=dt;
 if(player.regenT>3.5&&player.hp<player.maxHp&&player.hp>0){player.hp=Math.min(player.maxHp,player.hp+3);player.regenT=0;updateHUD();}
 // رمي القنابل الملقاة
 grenadesThrown.forEach(g=>{
  g.t-=dt;
  g.vel.y-=18*dt;
  g.mesh.position.x+=g.vel.x*dt;g.mesh.position.y+=g.vel.y*dt;g.mesh.position.z+=g.vel.z*dt;
  if(g.mesh.position.y<0.15){g.mesh.position.y=0.15;g.vel.y*=-0.3;g.vel.x*=0.7;g.vel.z*=0.7;}
  if(g.t<=0){
   explosionFX(g.mesh.position.x,0.5,g.mesh.position.z);
   enemies.forEach(e=>{if(!e.dead&&Math.hypot(e.x-g.mesh.position.x,e.z-g.mesh.position.z)<10){e.hp-=160;blood(e.x,1.2,e.z);if(e.hp<=0)killEnemy(e,false);}});
   const bd=pickups.filter(p=>p.type==='barrel');
   bd.forEach(b=>{if(Math.hypot(b.mesh.position.x-g.mesh.position.x,b.mesh.position.z-g.mesh.position.z)<9)detonateBarrel(b);});
   if(Math.hypot(player.x-g.mesh.position.x,player.z-g.mesh.position.z)<6)damagePlayer(20);
   scene.remove(g.mesh);grenadesThrown.splice(grenadesThrown.indexOf(g),1);
  }
 });
 // إعادة التحميل
 if(reloading&&performance.now()/1000>=reloadEnd)finishReload();
 // إطلاق مستمر
 if((firing||touch.fire)&&!reloading)tryShoot();
 game.time+=dt;
}

function updateCamera(dt){
 camera.position.set(player.x,1.7+Math.sin(game.time*2)*0.02-(adsAmt*0.05),player.z);
 camera.rotation.order='YXZ';
 camera.rotation.y=yaw;camera.rotation.x=pitch;
 // اهتزاز
 if(shakeAmt>0&&settings.shake){
  camera.rotation.x+=rand(-1,1)*0.02*shakeAmt;
  camera.rotation.y+=rand(-1,1)*0.02*shakeAmt;
  shakeAmt=Math.max(0,shakeAmt-dt*2.5);
 }
 // سلاح
 const fovT=adsAmt>0.5?55:75;
 camera.fov+=(fovT-camera.fov)*dt*10;camera.updateProjectionMatrix();
 weaponRig.position.x+=( (adsAmt>0.5?0:-0)-weaponRig.position.x)*dt*10+0; // تصويب: للوسط
 weaponRig.position.x=0.25*(1-adsAmt*0.9);
 weaponRig.position.y=-0.24+Math.sin(game.time*7)*0.004-(adsAmt*0.06);
 weaponRig.rotation.x=reloading?-0.5:0;
 if(reloading)weaponRig.rotation.z=Math.sin(performance.now()/200)*0.2;
 if(firing||touch.fire)weaponRig.position.z=-0.6+rand(-0.02,0.005);
 else weaponRig.position.z+=(-0.6-weaponRig.position.z)*dt*8;
}

// ---------- حلقة ----------
function loop(){
 requestAnimationFrame(loop);
 const dt=Math.min(clock.getDelta(),0.05);
 if(game.state==='playing'&&!game.paused&&!game.over){
  updatePlayer(dt);
  updateEnemies(dt);
  updateAllies(dt);
  // أعلام
  const t=performance.now()/1000;
  flags.forEach((f,i)=>{const p=f.geometry.attributes.position;const b=f.userData.base;for(let v=0;v<p.count;v++){const bx=b[v*3];p.setZ(v*3+2,Math.sin(t*4+bx*2+i)*0.12*(bx+1.5)/3);}p.needsUpdate=true;});
  // جزيئات
  particles.forEach(p=>{
   p.life-=dt;
   if(p.light){p.mesh.intensity=Math.max(0,p.life*200);}
   else{p.mesh.position.x+=p.vel.x*dt;p.mesh.position.y+=p.vel.y*dt;p.mesh.position.z+=p.vel.z*dt;p.vel.y+=p.grav*dt;p.mesh.material.opacity=clamp(p.life/p.maxLife,0,1);}
   if(p.life<=0){scene.remove(p.mesh);particles.splice(particles.indexOf(p),1);}
  });
  tracers.forEach(tr=>{tr.life-=dt;tr.mesh.material.opacity=Math.max(0,tr.life*10);if(tr.life<=0){scene.remove(tr.mesh);tracers.splice(tracers.indexOf(tr),1);}});
  // تدوير التقاطات
  pickups.forEach(p=>{if(p.mesh){p.mesh.rotation.y+=dt*2;p.mesh.position.y=0.5+Math.sin(performance.now()/300+p.x)*0.1;p.life-=0;}});
  updateCamera(dt);
  if(Math.floor(performance.now()/100)%2===0)drawMinimap();
 }
 renderer.render(scene,camera);
}

// ---------- إدخال: كمبيوتر ----------
function bindDesktop(){
 addEventListener('keydown',e=>{keys[e.code]=true;
  if(e.code==='KeyR')startReload();
  if(e.code==='KeyG'||e.code==='KeyQ')throwGrenade();
  if(e.code==='KeyP'||e.code==='Escape'){if(game.state==='playing')togglePause();}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 });
 addEventListener('keyup',e=>{keys[e.code]=false;});
 let dragging=false,lx=0,ly=0;
 const cv=()=>renderer.domElement;
 document.addEventListener('mousedown',e=>{if(game.state!=='playing'||game.paused)return;if(e.target.closest('button'))return;
  if(e.button===0){firing=true;audio();}
  if(!document.pointerLockElement&&e.target===renderer.domElement){renderer.domElement.requestPointerLock&&renderer.domElement.requestPointerLock();}
 });
 document.addEventListener('mouseup',e=>{if(e.button===0)firing=false;});
 document.addEventListener('mousemove',e=>{
  if(game.state!=='playing'||game.paused)return;
  let dx=e.movementX||0,dy=e.movementY||0;
  if(document.pointerLockElement){yaw-=dx*0.0022*settings.sens;pitch-=dy*0.0022*settings.sens;}
  else if(dragging){yaw-=(e.clientX-lx)*0.005*settings.sens;pitch-=(e.clientY-ly)*0.005*settings.sens;lx=e.clientX;ly=e.clientY;}
  pitch=clamp(pitch,-1.35,1.35);
 });
 // سحب بدون pointer lock
 renderer.domElement.addEventListener('mousedown',e=>{dragging=true;lx=e.clientX;ly=e.clientY;});
}

// ---------- إدخال: لمس ----------
function bindTouch(){
 const isTouch='ontouchstart'in window||navigator.maxTouchPoints>0;
 if(isTouch)$('touch-ui').classList.remove('hidden');
 const joy=$('joystick'),stick=$('stick');
 let joyId=null;
 const jr=()=>joy.getBoundingClientRect();
 joy.addEventListener('touchstart',e=>{e.preventDefault();joyId=e.changedTouches[0].identifier;touch.active=true;audio();},{passive:false});
 addEventListener('touchmove',e=>{
  for(const t of e.changedTouches){
   if(t.identifier===joyId){
    const r=jr(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=(t.clientX-cx)/(r.width/2),dy=(t.clientY-cy)/(r.height/2);
    const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
    touch.joy.x=dx;touch.joy.y=dy;
    stick.style.transform=`translate(${dx*36}px,${dy*36}px)`;
   }else if(t.identifier===touch.lookId){
    const dx=t.clientX-touch.lastLX,dy=t.clientY-touch.lastLY;
    touch.lastLX=t.clientX;touch.lastLY=t.clientY;
    yaw-=dx*0.006*settings.sens;pitch=clamp(pitch-dy*0.006*settings.sens,-1.35,1.35);
   }
  }
 },{passive:false});
 addEventListener('touchend',e=>{
  for(const t of e.changedTouches){
   if(t.identifier===joyId){joyId=null;touch.joy.x=0;touch.joy.y=0;stick.style.transform='';}
   if(t.identifier===touch.lookId)touch.lookId=null;
  }
 });
 // منطقة النظر: يمين الشاشة
 renderer.domElement.addEventListener('touchstart',e=>{
  audio();
  for(const t of e.changedTouches){
   if(t.clientX>innerWidth*0.4&&touch.lookId===null){touch.lookId=t.identifier;touch.lastLX=t.clientX;touch.lastLY=t.clientY;}
  }
 },{passive:true});
 const hold=(id,down,up)=>{const el=$(id);el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();audio();down();},{passive:false});el.addEventListener('touchend',e=>{e.preventDefault();up&&up();},{passive:false});};
 hold('t-fire',()=>touch.fire=true,()=>touch.fire=false);
 hold('t-ads',()=>{touch.ads=!touch.ads;$('t-ads').style.background=touch.ads?'rgba(212,175,55,.8)':'rgba(10,20,40,.7)';});
 hold('t-reload',()=>startReload());
 hold('t-grenade',()=>throwGrenade());
 hold('t-jump',()=>{toast('الله أكبر! 🇮🇶');SFX.wave();});
}

// ---------- إيقاف ----------
function togglePause(force){
 game.paused=force!==undefined?force:!game.paused;
 if(game.paused){show('pause-screen');firing=false;touch.fire=false;}
 else show(null);
}

// ---------- ربط الأزرار ----------
function bindUI(){
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{SFX.click();show(b.dataset.back);});
 $('btn-start').onclick=()=>{SFX.click();audio();openBrief(Math.min(save.unlocked-1,4));};
 $('btn-missions').onclick=()=>{SFX.click();buildMissionGrid();show('missions-screen');};
 $('btn-how').onclick=()=>{SFX.click();show('how-screen');};
 $('btn-settings').onclick=()=>{SFX.click();$('set-quality').value=settings.quality;$('set-sens').value=settings.sens;$('set-sound').checked=settings.sound;$('set-shake').checked=settings.shake;show('settings-screen');};
 $('set-quality').onchange=e=>{settings.quality=e.target.value;localStorage.setItem('ih_q',settings.quality);location.reload();};
 $('set-sens').oninput=e=>{settings.sens=parseFloat(e.target.value);localStorage.setItem('ih_s',settings.sens);};
 $('set-sound').onchange=e=>{settings.sound=e.target.checked;localStorage.setItem('ih_m',settings.sound?'1':'0');};
 $('set-shake').onchange=e=>{settings.shake=e.target.checked;localStorage.setItem('ih_sh',settings.shake?'1':'0');};
 $('btn-sound-top').onclick=e=>{settings.sound=!settings.sound;localStorage.setItem('ih_m',settings.sound?'1':'0');e.target.textContent=settings.sound?'🔊 الصوت':'🔇 الصوت';SFX.click();};
 $('btn-deploy').onclick=()=>{SFX.click();startMission(game.pendingMission||0);banner('mission-banner',`🇮🇶 ${MISSIONS[game.pendingMission||0].name}`);};
 $('btn-pause').onclick=()=>togglePause(true);
 $('btn-resume').onclick=()=>{SFX.click();togglePause(false);};
 $('btn-restart').onclick=()=>{SFX.click();startMission(game.mission);};
 $('btn-quit').onclick=()=>{SFX.click();game.state='menu';game.paused=false;$('hud').classList.add('hidden');show('main-menu');refreshMenu();};
 $('btn-next').onclick=()=>{SFX.click();openBrief(Math.min(game.mission+1,4));};
 $('btn-replay').onclick=()=>{SFX.click();startMission(game.mission);};
 $('btn-home').onclick=()=>{SFX.click();game.state='menu';show('main-menu');refreshMenu();};
 $('btn-mute').onclick=e=>{settings.sound=!settings.sound;localStorage.setItem('ih_m',settings.sound?'1':'0');e.target.textContent=settings.sound?'🔊':'🔇';};
 document.querySelector('.back-btn')&&null;
}

// ---------- إقلاع ----------
async function boot(){
 const fill=$('load-fill'),txt=$('load-text');
 const steps=['جاري تجهيز ساحة المعركة...','تحميل الدبابات والآليات...','تجهيز جنود الجيش العراقي...','رصد تحركات الإرهابيين...','اكتمل الاستعداد! الله أكبر 🇮🇶'];
 initThree();bindDesktop();bindTouch();bindUI();refreshMenu();
 for(let i=0;i<steps.length;i++){txt.textContent=steps[i];fill.style.width=(8+i*22)+'%';await new Promise(r=>setTimeout(r,220));}
 fill.style.width='100%';
 resetPlayer();
 // مشهد خلفية للقائمة: كاميرا تدور حول المدينة
 camera.position.set(0,14,46);camera.lookAt(0,2,-10);
 game.state='menu';
 (function menuCam(){if(game.state==='menu'){const t=performance.now()/1000;camera.position.set(Math.sin(t*0.1)*40,14,46+Math.cos(t*0.08)*6);camera.lookAt(0,3,-20);flags.forEach((f,i)=>{const p=f.geometry.attributes.position;const b=f.userData.base;for(let v=0;v<p.count;v++){p.setZ(v*3+2,Math.sin(t*4+b[v*3]*2+i)*0.12);}p.needsUpdate=true;});}requestAnimationFrame(menuCam);})();
 loop();
 show('main-menu');
 // بدء حلقة القائمة داخل loop أيضاً — الكاميرا تُدار هنا عند اللعب فقط
 setInterval(()=>{if(game.state==='menu')renderer.render(scene,camera);},33);
}
boot();
