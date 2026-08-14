// Theme handling - must run early
(function(){
  const saved = localStorage.getItem('odhc-theme') || 'auto';
  document.documentElement.setAttribute('data-theme', saved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta){
    const isDark = saved==='dark' || (saved==='auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', isDark ? '#0f0f0f' : '#fafafa');
  }
})();

import {openDB,getAll,get,put} from './db/database.js';
import {ensureBuiltin,listExercises,saveExercise,deleteExercise} from './db/exercises.js';
import {listWorkouts,getByDate,saveWorkout,deleteWorkout,lastSetsForExercise,recentExercises} from './db/workouts.js';
import {todayStr,fmtDateKor,monthMatrix,weekRange} from './utils/date.js';
import {exportJSON,downloadJSON} from './services/backup.js';
import {exportCSV} from './services/csv.js';
import {importJSON} from './services/import.js';

const $app=document.getElementById('app');const $nav=document.getElementById('nav');
let currentView='home';let selectedDate=todayStr();let calendarMode='month';let calYear=new Date().getFullYear();let calMonth=new Date().getMonth();
let widgetConfig=null;
const DEFAULT_WIDGETS=[
  {id:'calendar-preview',name:'캘린더 미리보기',on:true},
  {id:'quick-record',name:'빠른 기록',on:true},
  {id:'recent-exercise',name:'최근 운동',on:true},
  {id:'last-workout',name:'마지막 운동',on:true},
  {id:'weekly-count',name:'이번 주 운동',on:false}
];

async function loadWidgetConfig(){
  const s=await get('settings','widgets');
  if(s&&s.value){widgetConfig=s.value;return s.value;}
  widgetConfig=DEFAULT_WIDGETS;
  await put('settings',{key:'widgets',value:widgetConfig});
  return widgetConfig;
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('odhc-theme', theme);
  put('settings',{key:'theme',value:theme});
  const meta=document.querySelector('meta[name="theme-color"]');
  const isDark = theme==='dark' || (theme==='auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(meta) meta.setAttribute('content', isDark ? '#0f0f0f' : '#fafafa');
}
async function init(){
  await openDB();
  await ensureBuiltin();
  await loadWidgetConfig();
  const themeSetting = await get('settings','theme');
  if(themeSetting && themeSetting.value){
    applyTheme(themeSetting.value);
  }
  renderNav();
  router('home');
  if('serviceWorker' in navigator){
    try{await navigator.serviceWorker.register('./sw.js');}catch(e){console.log('SW fail',e)}
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
    const current = localStorage.getItem('odhc-theme')||'auto';
    if(current==='auto') applyTheme('auto');
  });
}
function renderNav(){
  $nav.innerHTML=`<nav class="bottom-nav">
    <button data-nav="home" class="${currentView==='home'?'active':''}">홈</button>
    <button data-nav="calendar" class="${currentView==='calendar'?'active':''}">캘린더</button>
    <button data-nav="records" class="${currentView==='records'?'active':''}">기록</button>
    <button data-nav="exercises" class="${currentView==='exercises'?'active':''}">운동</button>
    <button data-nav="settings" class="${currentView==='settings'?'active':''}">설정</button>
  </nav>`;
  $nav.querySelectorAll('button').forEach(b=>b.onclick=()=>router(b.dataset.nav));
}
function router(v){currentView=v;renderNav();if(v==='home')renderHome();else if(v==='calendar')renderCalendar();else if(v==='records')renderRecords();else if(v==='exercises')renderExercises();else if(v==='settings')renderSettings();}

async function renderHome(){
  const workouts=await listWorkouts();
  const dates=new Set(workouts.map(w=>w.date));
  const recent=await recentExercises(1);
  const last=workouts.sort((a,b)=>b.date.localeCompare(a.date))[0];
  const thisWeek=weekRange(todayStr()).filter(d=>dates.has(d)).length;
  const days=[];for(let i=-3;i<=3;i++){const d=new Date();d.setDate(d.getDate()+i);const ds=d.toISOString().slice(0,10);days.push({ds,isToday:i===0,has:dates.has(ds)});}
  const widgets=widgetConfig.filter(w=>w.on);
  let html=`<div class="header"><h1>ODHC</h1><span style="font-size:12px;color:var(--sub)">${todayStr()}</span></div><div class="stack">`;
  for(const w of widgets){
    if(w.id==='calendar-preview'){
      html+=`<div class="card"><div class="widget-title">캘린더 미리보기</div><div style="display:flex;justify-content:space-between">${days.map(d=>`<div style="text-align:center;flex:1"><div style="font-size:12px;${d.isToday?'font-weight:800;color:var(--text)':''}">${d.ds.slice(5)}</div><div>${d.has?'•':''}</div></div>`).join('')}</div></div>`;
    }else if(w.id==='quick-record'){
      html+=`<div class="card"><button class="btn-primary" style="width:100%;height:56px;font-size:16px" id="btn-quick">+ 운동 기록</button></div>`;
    }else if(w.id==='recent-exercise'){
      if(recent[0]) html+=`<div class="card"><div class="widget-title">최근 운동</div><div style="font-weight:700">${recent[0].name}</div><div style="font-size:14px;white-space:pre-line;margin-top:4px">${recent[0].sets.map(s=>`${s.weight}kg × ${s.reps}`).join('\n')}</div><div style="font-size:12px;color:var(--sub);margin-top:6px">${recent[0].date}</div></div>`;
      else html+=`<div class="card"><div class="widget-title">최근 운동</div><div class="empty">기록 없음</div></div>`;
    }else if(w.id==='last-workout'){
      if(last) html+=`<div class="card"><div class="widget-title">마지막 운동</div><div style="font-weight:700">${fmtDateKor(last.date)} · ${last.duration||0}분</div><div style="margin-top:8px">${last.exercises.map(e=>`<div style="font-size:13px">${e.exerciseNameSnapshot} ${e.sets.length}세트</div>`).join('')}</div></div>`;
      else html+=`<div class="card"><div class="widget-title">마지막 운동</div><div class="empty">기록 없음</div></div>`;
    }else if(w.id==='weekly-count'){
      html+=`<div class="card"><div class="widget-title">이번 주 운동</div><div style="font-size:28px;font-weight:800">${thisWeek}회</div><div style="font-size:12px;color:var(--sub)">월~일 기준</div></div>`;
    }
  }
  html+=`</div>`;
  $app.innerHTML=html;
  document.getElementById('btn-quick')?.addEventListener('click',()=>{selectedDate=todayStr();router('records');});
}

async function renderCalendar(){
  const workouts=await listWorkouts();const dateSet=new Set(workouts.map(w=>w.date));
  let matrix=[];let title='';
  if(calendarMode==='month'){title=`${calYear}년 ${calMonth+1}월`;matrix=monthMatrix(calYear,calMonth);}else{title=`주간 · ${fmtDateKor(selectedDate)}`;matrix=weekRange(selectedDate);}
  const detail=await getByDate(selectedDate);
  let html=`<div class="header"><h1>캘린더</h1><div class="row"><button class="btn-secondary" id="mode-month" style="${calendarMode==='month'?'background:var(--btn-bg);color:var(--btn-text)':''}">월</button><button class="btn-secondary" id="mode-week" style="${calendarMode==='week'?'background:var(--btn-bg);color:var(--btn-text)':''}">주</button></div></div>`;
  html+=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button class="btn-ghost" id="prev">‹</button><div style="font-weight:700">${title}</div><button class="btn-ghost" id="next">›</button></div>`;
  if(calendarMode==='month'){
    html+=`<div class="calendar-grid"><div class="dow">일</div><div class="dow">월</div><div class="dow">화</div><div class="dow">수</div><div class="dow">목</div><div class="dow">금</div><div class="dow">토</div>`;
    for(const d of matrix){if(d===null)html+=`<div class="day"></div>`;else{const sel=d===selectedDate;const has=dateSet.has(d);html+=`<div class="day ${has?'has-dot':''} ${sel?'selected':''}" data-date="${d}">${d.slice(8)}</div>`;}}
    html+=`</div>`;
  }else{
    html+=`<div class="calendar-grid">${matrix.map(d=>{const sel=d===selectedDate;const has=dateSet.has(d);return `<div class="day ${has?'has-dot':''} ${sel?'selected':''}" data-date="${d}"><div>${d.slice(5)}</div></div>`;}).join('')}</div>`;
  }
  html+=`</div><div class="card" style="margin-top:12px"><div style="font-weight:800">${fmtDateKor(selectedDate)}</div>`;
  if(detail){
    html+=`<div style="font-size:13px;color:var(--sub)">운동 시간 ${detail.duration||0}분</div>`;
    detail.exercises.forEach(ex=>{html+=`<div style="margin-top:12px"><div style="font-weight:700">${ex.exerciseNameSnapshot}</div><div style="white-space:pre-line;font-size:14px;margin-top:4px">${ex.sets.map(s=>`${s.weight}kg × ${s.reps}`).join('\n')}</div>${ex.memo?`<div style="font-size:12px;color:var(--sub);margin-top:4px">메모: ${ex.memo}</div>`:''}</div>`;});
    html+=`<div class="row" style="margin-top:12px"><button class="btn-primary" id="edit-detail">수정</button><button class="btn-secondary" id="del-detail">삭제</button></div>`;
  }else{
    html+=`<div class="empty">운동 기록 없음</div><button class="btn-primary" id="add-on-date" style="width:100%;margin-top:8px">이 날짜에 기록</button>`;
  }
  html+=`</div>`;
  $app.innerHTML=html;
  document.getElementById('mode-month').onclick=()=>{calendarMode='month';renderCalendar();};
  document.getElementById('mode-week').onclick=()=>{calendarMode='week';renderCalendar();};
  document.getElementById('prev').onclick=()=>{if(calendarMode==='month'){calMonth--;if(calMonth<0){calMonth=11;calYear--;}}else{const d=new Date(selectedDate);d.setDate(d.getDate()-7);selectedDate=d.toISOString().slice(0,10);}renderCalendar();};
  document.getElementById('next').onclick=()=>{if(calendarMode==='month'){calMonth++;if(calMonth>11){calMonth=0;calYear++;}}else{const d=new Date(selectedDate);d.setDate(d.getDate()+7);selectedDate=d.toISOString().slice(0,10);}renderCalendar();};
  $app.querySelectorAll('.day[data-date]').forEach(el=>el.onclick=()=>{selectedDate=el.dataset.date;renderCalendar();});
  document.getElementById('edit-detail')?.addEventListener('click',()=>router('records'));
  document.getElementById('del-detail')?.addEventListener('click',async()=>{if(confirm('이 날짜 기록을 삭제할까요?')){if(detail){await deleteWorkout(detail.id);renderCalendar();}}});
  document.getElementById('add-on-date')?.addEventListener('click',()=>router('records'));
}

async function renderRecords(){
  let workout=await getByDate(selectedDate);
  if(!workout) workout={id:selectedDate,date:selectedDate,duration:0,exercises:[],createdAt:Date.now(),updatedAt:Date.now()};
  let html=`<div class="header"><h1>기록</h1><input type="date" id="date-input" value="${selectedDate}" style="width:auto"></div>`;
  html+=`<div class="card"><div class="row"><span style="font-size:13px;color:var(--sub)">운동 시간</span><input id="duration" type="number" inputmode="numeric" placeholder="분" value="${workout.duration||''}" style="width:100px"><span style="color:var(--sub)">분</span></div></div>`;
  html+=`<div class="stack" style="margin-top:12px">`;
  if(workout.exercises.length===0) html+=`<div class="card empty">운동을 추가해보세요</div>`;
  for(let idx=0;idx<workout.exercises.length;idx++){
    const ex=workout.exercises[idx];
    html+=`<div class="card"><div class="row" style="justify-content:space-between"><div style="font-weight:800">${ex.exerciseNameSnapshot}</div><button class="btn-ghost" data-del-ex="${idx}">삭제</button></div>`;
    ex.sets.forEach((s,i)=>{
      html+=`<div class="set-row"><span class="idx">${i+1}세트</span><input type="number" inputmode="decimal" data-ex="${idx}" data-set="${i}" data-field="weight" value="${s.weight}"><span style="color:var(--sub)">kg ×</span><input type="number" inputmode="numeric" data-ex="${idx}" data-set="${i}" data-field="reps" value="${s.reps}"><span style="color:var(--sub)">회</span><button class="btn-ghost" data-del-set="${idx}-${i}">✕</button></div>`;
    });
    html+=`<div class="row" style="margin-top:6px"><button class="btn-secondary" data-add-set="${idx}">+ 세트 추가</button></div>`;
    html+=`<textarea data-memo="${idx}" placeholder="메모 (선택)">${ex.memo||''}</textarea></div>`;
  }
  html+=`</div><div class="row" style="margin-top:12px"><button class="btn-secondary" id="btn-add-ex" style="flex:1">+ 운동 추가</button><button class="btn-primary" id="btn-save" style="flex:1">저장</button></div>`;
  $app.innerHTML=html;
  document.getElementById('date-input').onchange=e=>{selectedDate=e.target.value;renderRecords();};
  document.getElementById('duration').oninput=e=>{workout.duration=Number(e.target.value)||0;};
  $app.querySelectorAll('input[data-field]').forEach(inp=>{
    inp.oninput=e=>{const exIdx=Number(e.target.dataset.ex);const setIdx=Number(e.target.dataset.set);const f=e.target.dataset.field;workout.exercises[exIdx].sets[setIdx][f]=Number(e.target.value)||0;};
  });
  $app.querySelectorAll('textarea[data-memo]').forEach(ta=>{
    ta.oninput=e=>{const exIdx=Number(e.target.dataset.memo);workout.exercises[exIdx].memo=e.target.value;if(!e.target.value)delete workout.exercises[exIdx].memo;};
  });
  $app.querySelectorAll('[data-add-set]').forEach(btn=>{
    btn.onclick=()=>{const exIdx=Number(btn.dataset.addSet);const last=workout.exercises[exIdx].sets[workout.exercises[exIdx].sets.length-1]||{weight:40,reps:10};workout.exercises[exIdx].sets.push({weight:last.weight,reps:last.reps});saveWorkout(workout).then(()=>renderRecords());};
  });
  $app.querySelectorAll('[data-del-set]').forEach(btn=>{
    btn.onclick=()=>{const [exIdx,setIdx]=btn.dataset.delSet.split('-').map(Number);workout.exercises[exIdx].sets.splice(setIdx,1);saveWorkout(workout).then(()=>renderRecords());};
  });
  $app.querySelectorAll('[data-del-ex]').forEach(btn=>{
    btn.onclick=()=>{const exIdx=Number(btn.dataset.delEx);workout.exercises.splice(exIdx,1);saveWorkout(workout).then(()=>renderRecords());};
  });
  document.getElementById('btn-save').onclick=async()=>{
    workout.exercises.forEach(ex=>{if(!ex.memo||!ex.memo.trim())delete ex.memo;});
    if(workout.exercises.length===0&&!workout.duration){alert('운동을 추가하세요');return;}
    workout.updatedAt=Date.now();await saveWorkout(workout);alert('저장되었습니다');router('calendar');
  };
  document.getElementById('btn-add-ex').onclick=()=>openExercisePicker(async chosen=>{
    const lastSets=await lastSetsForExercise(chosen.id);
    const sets=lastSets?lastSets.map(s=>({...s})): [{weight:40,reps:10}];
    workout.exercises.push({exerciseId:chosen.id,exerciseNameSnapshot:chosen.name,sets,memo:''});
    await saveWorkout(workout);renderRecords();
  });
}

let pickerCallback=null;
let pickerQuery='';
function openExercisePicker(cb){pickerCallback=cb;pickerQuery='';document.getElementById('ex-modal').classList.add('open');renderPickerList('');}
function closePicker(){document.getElementById('ex-modal').classList.remove('open');}
async function renderPickerList(q){
  pickerQuery=q;
  const all=await listExercises();const recent=await recentExercises(10);const qL=q.toLowerCase();
  let filtered=all.filter(e=>!q||e.name.toLowerCase().includes(qL)||e.muscle.includes(q));
  const muscles=['가슴','등','하체','어깨','팔','복근','전신'];
  const modal=document.getElementById('ex-modal-content');
  let shell=document.getElementById('ex-picker-shell');
  if(!shell){
    shell=document.createElement('div');
    shell.id='ex-picker-shell';
    shell.innerHTML=`<div class="search-box" style="position:sticky;top:0;background:var(--card);padding-bottom:8px;z-index:1"><input id="ex-search" placeholder="🔍 운동 검색"><div class="chips" id="ex-picker-muscles" style="margin-top:8px"><button data-muscle="" class="active">전체</button>${muscles.map(m=>`<button data-muscle="${m}">${m}</button>`).join('')}</div></div><div id="ex-picker-results"></div>`;
    modal.appendChild(shell);
    document.getElementById('ex-search').oninput=e=>renderPickerList(e.target.value);
  }
  const input=document.getElementById('ex-search');
  if(input && input.value!==q) input.value=q;
  const results=document.getElementById('ex-picker-results');
  let html='';
  if(recent.length&&!q) html+=`<div style="margin-top:12px"><div class="widget-title">최근 운동</div><div class="stack">${recent.map(r=>`<div class="card" data-pick-id="${r.exerciseId}" style="cursor:pointer">${r.name} · ${r.date}</div>`).join('')}</div></div>`;
  for(const mus of muscles){
    const list=filtered.filter(e=>e.muscle===mus);if(!list.length)continue;
    html+=`<div style="margin-top:12px"><div class="widget-title">${mus}</div><div class="stack">${list.map(e=>`<div class="card" data-pick-id="${e.id}" style="cursor:pointer"><div style="font-weight:700">${e.name}</div><div style="font-size:12px;color:var(--sub)">${e.muscle}</div></div>`).join('')}</div></div>`;
  }
  results.innerHTML=html;
  results.querySelectorAll('[data-pick-id]').forEach(el=>{
    el.onclick=async()=>{const id=el.dataset.pickId;const ex=(await listExercises()).find(x=>x.id===id);if(ex&&pickerCallback){pickerCallback(ex);closePicker();}};
  });
}

async function renderExercises(){
  const all=await listExercises();let q='';let activeMuscle='전체';const muscles=['전체','가슴','등','하체','어깨','팔','복근','전신'];
  let detailEl=null;
  const drawResults=()=>{
    let filtered=all;if(activeMuscle!=='전체')filtered=filtered.filter(e=>e.muscle===activeMuscle);if(q)filtered=filtered.filter(e=>e.name.toLowerCase().includes(q.toLowerCase()));
    let html='';
    const grouped={};filtered.forEach(e=>{if(!grouped[e.muscle])grouped[e.muscle]=[];grouped[e.muscle].push(e);});
    for(const mus of Object.keys(grouped)){html+=`<div><div class="widget-title">${mus}</div><div class="stack">${grouped[mus].map(e=>`<div class="card" data-ex-id="${e.id}" style="cursor:pointer"><div style="display:flex;justify-content:space-between"><span style="font-weight:700">${e.name}</span><span class="badge">${e.source==='custom'?'커스텀':'기본'}</span></div></div>`).join('')}</div></div>`;}
    const results=document.getElementById('exercise-results');
    if(results)results.innerHTML=html;
    results?.querySelectorAll('[data-ex-id]').forEach(el=>{
      el.onclick=async()=>{
        const id=el.dataset.exId;const ex=all.find(x=>x.id===id);
        const workouts=await listWorkouts();const history=[];workouts.filter(w=>w.exercises.some(ee=>ee.exerciseId===id)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).forEach(w=>{const ee=w.exercises.find(eee=>eee.exerciseId===id);history.push({date:w.date,sets:ee.sets});});
        let h=`<div class="card" style="margin-top:12px"><div style="font-weight:800">${ex.name}</div><div style="font-size:12px;color:var(--sub)">${ex.muscle}</div>`;
        h+=history.length?history.map(h=>`<div style="margin-top:8px"><div style="font-size:12px;color:var(--sub)">${h.date}</div><div style="font-size:14px">${h.sets.map(s=>`${s.weight}kg × ${s.reps}`).join(', ')}</div></div>`).join(''):'<div class="empty">기록 없음</div>';
        if(ex.source==='custom')h+=`<button class="btn-secondary" id="del-ex" style="width:100%;margin-top:12px">삭제</button>`;
        if(detailEl)detailEl.remove();detailEl=document.createElement('div');detailEl.id='ex-detail';detailEl.innerHTML=h;$app.appendChild(detailEl);
        document.getElementById('del-ex')?.addEventListener('click',async()=>{if(confirm('삭제할까요?')){await deleteExercise(id);drawResults();detailEl?.remove();detailEl=null;}});
      };
    });
  };
  $app.innerHTML=`<div class="header"><h1>운동</h1><button class="btn-primary" id="btn-new-ex">+ 추가</button></div><div class="card"><input id="ex-search-main" placeholder="🔍 운동 검색" value="${q}"><div class="chips" id="ex-muscles" style="margin-top:8px">${muscles.map(m=>`<button data-m="${m}" class="${m===activeMuscle?'active':''}">${m}</button>`).join('')}</div></div><div id="exercise-results" class="stack" style="margin-top:12px"></div>`;
  const search=document.getElementById('ex-search-main');
  search.oninput=e=>{q=e.target.value;drawResults();};
  $app.querySelectorAll('#ex-muscles [data-m]').forEach(b=>{b.onclick=()=>{activeMuscle=b.dataset.m;drawResults();$app.querySelectorAll('#ex-muscles [data-m]').forEach(x=>x.classList.toggle('active',x.dataset.m===activeMuscle));};});
  document.getElementById('btn-new-ex').onclick=()=>document.getElementById('new-ex-modal').classList.add('open');
  drawResults();
}

async function renderSettings(){
  const currentTheme = localStorage.getItem('odhc-theme')||'auto';
  let html=`<div class="header"><h1>설정</h1></div><div class="stack">`;
  html+=`<div class="card"><div style="font-weight:800;font-size:15px">테마</div><div style="font-size:13px;color:var(--sub);margin-top:4px">배경과 글자 색상 대비를 개선했습니다</div><div class="row" style="margin-top:12px"><button class="btn-secondary theme-btn ${currentTheme==='auto'?'active':''}" data-theme="auto" style="${currentTheme==='auto'?'background:var(--btn-bg);color:var(--btn-text)':''}">시스템 자동</button><button class="btn-secondary theme-btn ${currentTheme==='light'?'active':''}" data-theme="light" style="${currentTheme==='light'?'background:var(--btn-bg);color:var(--btn-text)':''}">라이트</button><button class="btn-secondary theme-btn ${currentTheme==='dark'?'active':''}" data-theme="dark" style="${currentTheme==='dark'?'background:var(--btn-bg);color:var(--btn-text)':''}">다크</button></div></div>`;
  html+=`<div class="card"><div style="font-weight:800">홈 화면 구성</div><div style="font-size:12px;color:var(--sub)">위젯 표시/숨김 및 순서 변경</div><div id="widget-list" class="stack" style="margin-top:12px"></div></div>`;
  html+=`<div class="card"><div style="font-weight:800">데이터 관리</div><div class="stack" style="margin-top:12px"><button class="btn-secondary" id="export-json">JSON 내보내기</button><button class="btn-secondary" id="export-csv">CSV 내보내기</button><div class="row"><select id="import-mode" style="width:140px"><option value="merge">병합</option><option value="overwrite">덮어쓰기</option></select><label class="btn-secondary" style="flex:1;text-align:center;cursor:pointer">JSON 가져오기<input type="file" id="import-file" accept=".json" style="display:none"></label></div><button class="btn-secondary" id="delete-all" style="color:#c00;border-color:#ffaaaa">전체 데이터 삭제</button></div></div>`;
  html+=`<div class="card"><div style="font-weight:800">정보</div><div style="font-size:13px;color:var(--sub);margin-top:8px">ODHC v3 - 완전 온디바이스. 모든 데이터는 기기에만 저장됩니다.</div><div style="font-size:12px;color:var(--sub);margin-top:8px">PWABuilder 호환 · IndexedDB · Vanilla JS</div></div></div>`;
  $app.innerHTML=html;

  $app.querySelectorAll('.theme-btn').forEach(btn=>{
    btn.onclick=()=>{
      const th=btn.dataset.theme;
      applyTheme(th);
      renderSettings();
    };
  });

  const listDiv=document.getElementById('widget-list');
  const renderW=()=>{
    listDiv.innerHTML=widgetConfig.map((w,i)=>`<div class="row card" style="padding:10px 12px"><span style="flex:1;font-weight:500">${w.name}</span><label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" ${w.on?'checked':''} data-w="${w.id}"> 표시</label><button class="btn-ghost" data-up="${i}">↑</button><button class="btn-ghost" data-down="${i}">↓</button></div>`).join('');
    listDiv.querySelectorAll('input[data-w]').forEach(inp=>{
      inp.onchange=async e=>{const id=e.target.dataset.w;const cfg=widgetConfig.find(x=>x.id===id);cfg.on=e.target.checked;await put('settings',{key:'widgets',value:widgetConfig});};
    });
    listDiv.querySelectorAll('[data-up]').forEach(b=>{b.onclick=async()=>{const i=Number(b.dataset.up);if(i>0){[widgetConfig[i-1],widgetConfig[i]]=[widgetConfig[i],widgetConfig[i-1]];await put('settings',{key:'widgets',value:widgetConfig});renderW();}};});
    listDiv.querySelectorAll('[data-down]').forEach(b=>{b.onclick=async()=>{const i=Number(b.dataset.down);if(i<widgetConfig.length-1){[widgetConfig[i+1],widgetConfig[i]]=[widgetConfig[i],widgetConfig[i+1]];await put('settings',{key:'widgets',value:widgetConfig});renderW();}};});
  };
  renderW();

  document.getElementById('export-json').onclick=async()=>{const data=await exportJSON();downloadJSON(data);};
  document.getElementById('export-csv').onclick=()=>exportCSV();
  document.getElementById('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;const txt=await file.text();try{const obj=JSON.parse(txt);const mode=document.getElementById('import-mode').value;await importJSON(obj,mode);alert('가져오기 완료');}catch(err){alert('실패: '+err.message);}};
  document.getElementById('delete-all').onclick=async()=>{if(confirm('정말 모든 데이터를 삭제할까요?')){const exs=await getAll('exercises');for(const ee of exs)if(ee.source==='custom')await (await import('../db/database.js')).del('exercises',ee.id);const wos=await getAll('workouts');for(const w of wos)await (await import('../db/database.js')).del('workouts',w.id);alert('삭제 완료');}};
}

init();
document.getElementById('ex-modal-close').onclick=closePicker;
document.getElementById('ex-modal').onclick=e=>{if(e.target.id==='ex-modal')closePicker();};
document.getElementById('new-ex-close').onclick=()=>document.getElementById('new-ex-modal').classList.remove('open');
document.getElementById('new-ex-modal').onclick=e=>{if(e.target.id==='new-ex-modal')document.getElementById('new-ex-modal').classList.remove('open');};
document.getElementById('new-ex-form').onsubmit=async e=>{
  e.preventDefault();
  const name=document.getElementById('new-ex-name').value.trim();
  const muscle=document.getElementById('new-ex-muscle').value;
  const desc=document.getElementById('new-ex-desc').value.trim();
  if(!name||!muscle){alert('이름과 근육 부위는 필수');return;}
  const id=name.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now();
  const now=Date.now();
  await saveExercise({id,name,muscle,description:desc,source:'custom',createdAt:now,updatedAt:now});
  document.getElementById('new-ex-modal').classList.remove('open');e.target.reset();renderExercises();
};
