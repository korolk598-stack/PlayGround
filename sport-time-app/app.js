// لياقتي ووقتي - منطق التطبيق (يعمل بدون إنترنت، يحفظ في المتصفح)
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d }catch{ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};
const todayKey = () => new Date().toISOString().slice(0,10);

// ---------- التاريخ والتحية ----------
function initDate(){
  const d = new Date();
  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  $('#dateLine').textContent = `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const h = d.getHours();
  const name = store.get('fit_name','');
  const n = name ? ` يا ${name}` : '';
  $('#greeting').textContent = h < 12 ? `صباح النشاط${n}! ☀️` : h < 18 ? `مساء القوة${n}! 💪` : `مساء الإنجاز${n}! 🌙`;
  if(name) $('#userName').value = name;
}
$('#saveName').onclick = ()=>{ store.set('fit_name', $('#userName').value.trim()); initDate(); toast('تم حفظ اسمك بنجاح ✅'); };

// ---------- التنقل ----------
$$('.nav-btn').forEach(b=> b.onclick = ()=> go(b.dataset.page));
$$('.quick').forEach(q=> q.onclick = ()=> go(q.dataset.go));
function go(p){
  $$('.nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.page===p));
  $$('.page').forEach(s=> s.classList.toggle('active', s.id==='page-'+p));
  window.scrollTo({top:0, behavior:'smooth'});
}

// ---------- الوضع الليلي ----------
if(store.get('fit_theme','dark')==='light') document.body.classList.add('light');
$('#themeBtn').textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
$('#themeBtn').onclick = ()=>{
  document.body.classList.toggle('light');
  store.set('fit_theme', document.body.classList.contains('light')?'light':'dark');
  $('#themeBtn').textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
};

// ---------- حكم تحفيزية ----------
const quotes = [
  '“لا تقارن بدايتك بمنتصف طريق الآخرين.”',
  '“جسمك يستطيع فعل أي شيء… عقلك هو من يحتاج الإقناع.”',
  '“التمرين السيئ الوحيد هو الذي لم يحدث.”',
  '“الانضباط هو اختيار ما تريده أكثر على ما تريده الآن.”',
  '“قطرة مطر واحدة لا تصنع نهراً، لكن الالتزام اليومي يصنع بطلاً.”',
  '“نظّم وقتك تحكم حياتك.”',
  '“ابدأ صغيراً… استمر طويلاً.”'
];
function newQuote(){ $('#quoteText').textContent = quotes[Math.floor(Math.random()*quotes.length)]; }
$('#newQuote').onclick = newQuote; newQuote();

// ---------- التمارين ----------
const EXERCISES = [
  {n:'جري في المكان', c:'cardio', t:'5 دقائق • إحماء', i:'🏃'},
  {n:'قفز الحبل', c:'cardio', t:'3 جولات • حرق عالٍ', i:'🤸'},
  {n:'بيربي', c:'cardio', t:'10 تكرارات × 3', i:'🔥'},
  {n:'دراجة / مشي سريع', c:'cardio', t:'15 دقيقة', i:'🚴'},
  {n:'تمرين الضغط (Push-up)', c:'strength', t:'12 تكرار × 3', i:'💪'},
  {n:'سكوات (قرفصاء)', c:'strength', t:'15 تكرار × 3', i:'🦵'},
  {n:'بلانك', c:'strength', t:'60 ثانية × 3', i:'🧱'},
  {n:'تمارين البطن', c:'strength', t:'20 تكرار × 3', i:'🔳'},
  {n:'لانجز', c:'strength', t:'10 لكل رجل × 3', i:'⚡'},
  {n:'تمدد كامل الجسم', c:'flex', t:'10 دقائق • استشفاء', i:'🧘'},
  {n:'يوغا الصباح', c:'flex', t:'10 دقائق • مرونة', i:'🌅'},
  {n:'تمدد الرقبة والكتف', c:'flex', t:'5 دقائق • مكتب', i:'💆'},
];
let filter = 'all';
$$('.chip').forEach(ch=> ch.onclick = ()=>{ $$('.chip').forEach(x=>x.classList.remove('active')); ch.classList.add('active'); filter = ch.dataset.f; renderEx(); });
function renderEx(){
  const list = $('#exList'); list.innerHTML = '';
  EXERCISES.filter(e=> filter==='all'||e.c===filter).forEach(e=>{
    const div = document.createElement('div'); div.className='ex';
    div.innerHTML = `<div class="e-ico">${e.i}</div><div><b>${e.n}</b><small>${e.t}</small></div>`;
    const btn = document.createElement('button'); btn.textContent='+'; btn.title='أضف للخطة';
    btn.onclick = ()=>{ const plan = store.get('fit_plan',[]); plan.push(e.n); store.set('fit_plan',plan); renderPlan(); toast('أُضيف: '+e.n); };
    div.appendChild(btn); list.appendChild(div);
  });
}
function renderPlan(){
  const plan = store.get('fit_plan',[]);
  const box = $('#planList'); box.innerHTML = plan.length?'':'<p class="hint">أضف تمارين من المكتبة بالضغط على زر +</p>';
  plan.forEach((p,i)=>{
    const d = document.createElement('div'); d.className='plan-item';
    d.innerHTML = `<span>• ${p}</span>`;
    const x = document.createElement('button'); x.className='del'; x.textContent='✖'; x.onclick=()=>{ plan.splice(i,1); store.set('fit_plan',plan); renderPlan(); };
    d.appendChild(x); box.appendChild(d);
  });
}
$('#clearPlan').onclick = ()=>{ store.set('fit_plan',[]); renderPlan(); };
$('#finishWorkout').onclick = ()=>{
  const plan = store.get('fit_plan',[]);
  const title = plan.length ? plan.join(' + ') : 'تمرين حر';
  const hist = store.get('fit_hist',[]);
  hist.unshift({d: todayKey(), t: title, time: new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})});
  store.set('fit_hist', hist.slice(0,50));
  store.set('fit_plan',[]);
  renderPlan(); renderHist(); updateStats(); drawChart();
  toast('أحسنت! تم تسجيل تمرينك 🎉');
};
function renderHist(){
  const hist = store.get('fit_hist',[]);
  const box = $('#historyList'); box.innerHTML = hist.length?'':'<p class="hint">لا يوجد سجل بعد. أنجز أول تمرين اليوم!</p>';
  hist.slice(0,10).forEach(h=>{
    const d = document.createElement('div'); d.className='plan-item';
    d.innerHTML = `<span>🏅 ${h.t}</span><span class="badge">${h.d} • ${h.time}</span>`;
    box.appendChild(d);
  });
}
$('#clearHistory').onclick = ()=>{ store.set('fit_hist',[]); renderHist(); updateStats(); drawChart(); };

// ---------- المؤقت الرياضي ----------
let tInt=null, tMode='work', tLeft=30, tRound=0, tTotal=8, tWork=30, tRest=10;
const CIRC = 534;
function beep(freq=880, dur=.25){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value=freq;
    o.start(); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime+dur); o.stop(ctx.currentTime+dur);
  }catch{}
}
function drawRing(pct, color){
  $('#ringFg').style.strokeDashoffset = CIRC*(1-pct);
  if(color) $('#ringFg').style.stroke = color;
}
function timerTick(){
  tLeft--;
  if(tLeft<=0){
    if(tMode==='work'){ beep(660,.4); tMode='rest'; tLeft=tRest; $('#timerPhase').textContent='راحة 😮‍💨'; drawRing(1,'#38bdf8'); }
    else{
      tRound++;
      if(tRound>=tTotal){ stopTimer(true); return; }
      beep(880,.4); setTimeout(()=>beep(880,.4),300);
      tMode='work'; tLeft=tWork; $('#timerPhase').textContent='تمرّن! 🔥'; drawRing(1,'#22c55e');
    }
  }
  $('#timerText').textContent = tLeft;
  $('#roundText').textContent = `${Math.min(tRound+ (tMode==='work'?1:0), tTotal)} / ${tTotal}`;
  const total = tMode==='work'?tWork:tRest;
  drawRing(tLeft/total);
  if(tLeft<=3 && tLeft>0) beep(440,.12);
}
function stopTimer(done){
  clearInterval(tInt); tInt=null; $('#timerState').textContent = done?'اكتمل! 🎉':'متوقف';
  if(done){ beep(880,.5); setTimeout(()=>beep(1100,.6),400); bumpDay('workouts',1); updateStats(); drawChart(); toast('ممتاز! أكملت كل الجولات 🏆'); }
}
$('#startTimer').onclick = ()=>{
  if(tInt) return;
  tWork=+$('#workSec').value||30; tRest=+$('#restSec').value||10; tTotal=+$('#roundsNum').value||8;
  if(!tInt && $('#timerState').textContent!=='يعمل...' && tLeft<=0 || tRound>=tTotal){ tMode='work'; tLeft=tWork; tRound=0; }
  if(tRound===0 && tMode==='work' && $('#roundText').textContent.startsWith('0')){ tLeft=tWork; }
  $('#timerState').textContent='يعمل...'; $('#timerPhase').textContent = tMode==='work'?'تمرّن! 🔥':'راحة 😮‍💨';
  beep(880,.3);
  tInt=setInterval(timerTick,1000);
};
$('#pauseTimer').onclick = ()=>{ clearInterval(tInt); tInt=null; $('#timerState').textContent='متوقف مؤقتاً'; };
$('#resetTimer').onclick = ()=>{ clearInterval(tInt); tInt=null; tMode='work'; tRound=0; tLeft=+$('#workSec').value||30; $('#timerText').textContent=tLeft; $('#roundText').textContent=`0 / ${+$('#roundsNum').value||8}`; $('#timerState').textContent='متوقف'; $('#timerPhase').textContent='استعد...'; drawRing(1,'#22c55e'); };

// ---------- المهام ----------
function getTasks(){ return store.get('fit_tasks_'+todayKey(), []); }
function setTasks(t){ store.set('fit_tasks_'+todayKey(), t); }
$('#taskForm').onsubmit = e=>{
  e.preventDefault();
  const v = $('#taskInput').value.trim(); if(!v) return;
  const t = getTasks(); t.push({t:v, time:$('#taskTime').value, p:$('#taskPriority').value, done:false});
  setTasks(t); $('#taskInput').value=''; renderTasks(); updateStats();
};
function renderTasks(){
  const t = getTasks(); const box = $('#taskList'); box.innerHTML = t.length?'':'<p class="hint">لا مهام بعد. أضف أول مهمة ليومك ✨</p>';
  t.forEach((x,i)=>{
    const d = document.createElement('div'); d.className='task-item'+(x.done?' done':'');
    d.innerHTML = `<input type="checkbox" ${x.done?'checked':''}><span class="t">${x.t}</span><span class="badge">${x.time||'--:--'} • ${x.p}</span>`;
    d.querySelector('input').onchange = ev=>{ t[i].done=ev.target.checked; setTasks(t); renderTasks(); updateStats(); if(ev.target.checked) toast('مهمة منجزة! استمر ✅'); };
    const del = document.createElement('button'); del.className='del'; del.textContent='🗑️'; del.onclick=()=>{ t.splice(i,1); setTasks(t); renderTasks(); updateStats(); };
    d.appendChild(del); box.appendChild(d);
  });
  const done = t.filter(x=>x.done).length;
  const pct = t.length? Math.round(done/t.length*100):0;
  $('#taskBar').style.width = pct+'%'; $('#taskProgress').textContent = pct+'%';
}

// ---------- الجدول ----------
function getSched(){ return store.get('fit_sched_'+todayKey(), []); }
$('#schedForm').onsubmit = e=>{
  e.preventDefault();
  const s = getSched(); s.push({time:$('#schedTime').value, t:$('#schedTitle').value.trim()});
  s.sort((a,b)=>a.time.localeCompare(b.time));
  store.set('fit_sched_'+todayKey(), s); $('#schedTitle').value=''; renderSched();
};
function renderSched(){
  const s = getSched(); const box = $('#schedList'); box.innerHTML = s.length?'':'<p class="hint">مثال: 07:00 جري • 09:00 دراسة • 21:00 نوم</p>';
  s.forEach((x,i)=>{
    const d = document.createElement('div'); d.className='sched-item';
    d.innerHTML = `<span class="badge">🕐 ${x.time}</span><span>${x.t}</span>`;
    const del = document.createElement('button'); del.className='del'; del.textContent='✖'; del.onclick=()=>{ s.splice(i,1); store.set('fit_sched_'+todayKey(),s); renderSched(); };
    d.appendChild(del); box.appendChild(d);
  });
}
$('#clearSchedule').onclick = ()=>{ store.set('fit_sched_'+todayKey(),[]); renderSched(); };

// ---------- الماء ----------
function getWater(){ return store.get('fit_water_'+todayKey(), 0); }
function renderWater(){
  const w = getWater(); const box = $('#waterCups'); box.innerHTML='';
  for(let i=0;i<8;i++){
    const c = document.createElement('div'); c.className='cup'+(i<w?' done':''); c.textContent='💧';
    c.onclick = ()=>{ store.set('fit_water_'+todayKey(), i<w? i : i+1); renderWater(); updateStats(); };
    box.appendChild(c);
  }
}
$('#resetWater').onclick = ()=>{ store.set('fit_water_'+todayKey(),0); renderWater(); updateStats(); };

// ---------- بومودورو ----------
let pomInt=null, pomLeft=25*60, pomLen=25, pomSession=1, pomBreak=false;
$$('.pom-preset').forEach(b=> b.onclick=()=>{
  $$('.pom-preset').forEach(x=>x.classList.remove('active-preset')); b.classList.add('active-preset');
  pomLen=+b.dataset.m; pomLeft=pomLen*60; pomBreak=false; clearInterval(pomInt); pomInt=null; pomView();
});
function pomView(){
  const m = String(Math.floor(pomLeft/60)).padStart(2,'0'), s = String(pomLeft%60).padStart(2,'0');
  $('#pomText').textContent = `${m}:${s}`;
  $('#pomPhase').textContent = pomBreak ? 'راحة ☕ استرخِ قليلاً' : `جلسة تركيز • الجلسة رقم ${pomSession}`;
}
$('#pomStart').onclick = e=>{
  if(pomInt){ clearInterval(pomInt); pomInt=null; e.target.textContent='▶️ استئناف'; return; }
  e.target.textContent='⏸️ إيقاف مؤقت'; beep(880,.3);
  pomInt=setInterval(()=>{
    pomLeft--;
    if(pomLeft<=0){
      clearInterval(pomInt); pomInt=null; beep(880,.5);
      if(!pomBreak){ bumpDay('focus', pomLen); pomBreak=true; pomLeft=5*60; toast('جلسة رائعة! خذ راحة 5 دقائق ☕'); }
      else{ pomBreak=false; pomSession++; pomLeft=pomLen*60; toast('انتهت الراحة. جاهز للجولة التالية؟ 💪'); }
      $('#pomStart').textContent='▶️ ابدأ التركيز'; updateStats(); drawChart();
    }
    pomView();
  },1000);
};
$('#pomReset').onclick = ()=>{ clearInterval(pomInt); pomInt=null; pomLeft=pomLen*60; pomBreak=false; pomView(); $('#pomStart').textContent='▶️ ابدأ التركيز'; };

// ---------- العادات ----------
function getHabits(){ return store.get('fit_habits', ['صلاة الفجر 🕌','تمرين 15 دقيقة 💪','قراءة 10 صفحات 📖']); }
function getHabitDone(){ return store.get('fit_habitdone_'+todayKey(), {}); }
$('#habitForm').onsubmit = e=>{ e.preventDefault(); const h=getHabits(); h.push($('#habitInput').value.trim()); store.set('fit_habits',h); $('#habitInput').value=''; renderHabits(); };
function renderHabits(){
  const h=getHabits(), done=getHabitDone(); const box=$('#habitsList'); box.innerHTML='';
  h.forEach((x,i)=>{
    const d=document.createElement('div'); d.className='task-item'+(done[i]?' done':'');
    d.innerHTML=`<input type="checkbox" ${done[i]?'checked':''}><span class="t">${x}</span>`;
    d.querySelector('input').onchange=ev=>{ const dd=getHabitDone(); dd[i]=ev.target.checked; store.set('fit_habitdone_'+todayKey(),dd); renderHabits(); calcStreak(); };
    const del=document.createElement('button'); del.className='del'; del.textContent='✖'; del.onclick=()=>{ h.splice(i,1); store.set('fit_habits',h); renderHabits(); };
    d.appendChild(del); box.appendChild(d);
  });
}

// ---------- إحصائيات ----------
function dayData(k){ return store.get('fit_day_'+k+'_'+todayKey(), 0); }
function bumpDay(k,n){
  store.set('fit_day_'+k+'_'+todayKey(), dayData(k)+n);
  const hist = store.get('fit_days',[]);
  if(!hist.includes(todayKey())){ hist.push(todayKey()); store.set('fit_days',hist.slice(-60)); }
  calcStreak();
}
function calcStreak(){
  const days = store.get('fit_days',[]);
  $('#streakNum').textContent = days.length;
}
function updateStats(){
  const histToday = store.get('fit_hist',[]).filter(h=>h.d===todayKey()).length;
  $('#statWorkouts').textContent = histToday + dayData('workouts');
  const t = getTasks(); const pct = t.length? Math.round(t.filter(x=>x.done).length/t.length*100):0;
  $('#statTasks').textContent = pct+'%';
  $('#statWater').textContent = getWater()+'/8';
  $('#statFocus').textContent = dayData('focus');
}
function drawChart(){
  const cv = $('#chart'), ctx = cv.getContext('2d');
  const labels = $('#weekLabels'); labels.innerHTML='';
  ctx.clearRect(0,0,cv.width,cv.height);
  const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const vals = days.map(k=> store.get('fit_hist',[]).filter(h=>h.d===k).length + store.get('fit_day_workouts_'+k,0)*0.5 + store.get('fit_day_focus_'+k,0)/25 );
  const max = Math.max(3,...vals);
  const bw = cv.width/7;
  vals.forEach((v,i)=>{
    const h = (v/max)*(cv.height-50);
    ctx.fillStyle = i===6 ? '#22c55e' : '#38bdf8aa';
    ctx.beginPath(); ctx.roundRect(i*bw+14, cv.height-20-h, bw-28, h, 8); ctx.fill();
    const d = new Date(days[i]);
    const l = document.createElement('span'); l.textContent = ['أحد','اثنين','ثلا','أرب','خمي','جمع','سبت'][d.getDay()];
    labels.appendChild(l);
  });
}

// ---------- تنبيه صغير ----------
function toast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2200);
}
const st = document.createElement('style');
st.textContent = '.toast{position:fixed;bottom:90px;right:50%;transform:translateX(50%) translateY(20px);background:#16a34a;color:#fff;padding:12px 20px;border-radius:14px;font-weight:bold;opacity:0;transition:.3s;z-index:99;max-width:90vw;text-align:center}.toast.show{opacity:1;transform:translateX(50%) translateY(0)}';
document.head.appendChild(st);

// ---------- تشغيل ----------
initDate(); renderEx(); renderPlan(); renderHist(); renderTasks(); renderSched(); renderWater(); renderHabits(); updateStats(); drawChart(); calcStreak(); pomView();
$('#timerText').textContent = $('#workSec').value;
setInterval(initDate, 60000);
