import {openDB,put} from '../db/database.js';

function parseCSV(text){
  const rows=[];let row=[];let field='';let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'){
        if(text[i+1]==='"'){field+='"';i++;}
        else quoted=false;
      }else field+=ch;
    }else if(ch==='"') quoted=true;
    else if(ch===','){row.push(field);field='';}
    else if(ch==='\n'){row.push(field);rows.push(row);row=[];field='';}
    else if(ch!=='\r') field+=ch;
  }
  if(field!==''||row.length){row.push(field);rows.push(row);}
  return rows;
}

export async function importCSV(file){
  const text=await file.text();
  const rows=parseCSV(text.trim());
  if(rows.length<2)throw new Error('CSV 데이터가 없습니다.');
  const header=rows[0].map(v=>v.trim());
  const required=['date','duration','exerciseId','exerciseName','set_index','weight','reps','memo'];
  if(!required.every(k=>header.includes(k)))throw new Error('ODHC CSV 형식이 아닙니다.');
  const idx=Object.fromEntries(header.map((k,i)=>[k,i]));
  const workouts=new Map();
  for(const r of rows.slice(1)){
    if(!r[idx.date])continue;
    const date=r[idx.date];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    if(!workouts.has(date))workouts.set(date,{id:date,date,duration:Number(r[idx.duration])||0,exercises:[],createdAt:Date.now(),updatedAt:Date.now()});
    const w=workouts.get(date);const exerciseId=r[idx.exerciseId]||r[idx.exerciseName];
    let ex=w.exercises.find(e=>e.exerciseId===exerciseId);
    if(!ex){ex={exerciseId,exerciseNameSnapshot:r[idx.exerciseName]||exerciseId,sets:[],memo:r[idx.memo]||''};w.exercises.push(ex);}
    ex.sets.push({weight:Number(r[idx.weight])||0,reps:Number(r[idx.reps])||0});
    if(r[idx.memo])ex.memo=r[idx.memo];
  }
  await openDB();
  for(const workout of workouts.values())await put('workouts',workout);
  return workouts.size;
}

function sectionTitle(text){
  const el=document.createElement('div');
  el.className='widget-title';
  el.style.marginTop='4px';
  el.textContent=text;
  return el;
}

function separator(){
  const el=document.createElement('div');
  el.style.height='1px';
  el.style.background='var(--sub)';
  el.style.opacity='0.2';
  el.style.margin='8px 0';
  return el;
}

function installSettingsLayout(){
  const cards=[...document.querySelectorAll('.card')];
  const card=cards.find(c=>c.textContent.includes('데이터 관리')&&c.querySelector('#export-json'));
  if(!card||card.dataset.dataManagementEnhanced==='1')return;
  const stack=card.querySelector(':scope > .stack');
  const exportJson=card.querySelector('#export-json');
  const exportCsv=card.querySelector('#export-csv');
  const importRow=card.querySelector('#import-mode')?.closest('.row');
  const importMode=card.querySelector('#import-mode');
  const jsonLabel=card.querySelector('#import-file')?.closest('label');
  const deleteAll=card.querySelector('#delete-all');
  if(!stack||!exportJson||!exportCsv||!importMode||!jsonLabel||!deleteAll)return;

  card.dataset.dataManagementEnhanced='1';
  stack.innerHTML='';

  stack.appendChild(sectionTitle('내보내기'));
  stack.appendChild(exportJson);
  stack.appendChild(exportCsv);
  stack.appendChild(separator());
  stack.appendChild(sectionTitle('가져오기'));

  importMode.style.width='100%';
  stack.appendChild(importMode);
  stack.appendChild(jsonLabel);

  const csvLabel=document.createElement('label');
  csvLabel.className='btn-secondary';
  csvLabel.style.cssText='width:100%;text-align:center;cursor:pointer;box-sizing:border-box';
  csvLabel.textContent='CSV 가져오기';
  const csvInput=document.createElement('input');
  csvInput.type='file';
  csvInput.accept='.csv,text/csv';
  csvInput.style.display='none';
  csvLabel.appendChild(csvInput);
  stack.appendChild(csvLabel);

  stack.appendChild(separator());
  stack.appendChild(deleteAll);

  csvInput.onchange=async e=>{
    const file=e.target.files[0];
    if(!file)return;
    try{
      const count=await importCSV(file);
      alert(`${count}일의 운동 기록을 가져왔습니다.`);
      location.reload();
    }catch(err){
      alert(`CSV 가져오기 실패: ${err.message}`);
      e.target.value='';
    }
  };
}

const observer=new MutationObserver(installSettingsLayout);
observer.observe(document.body,{childList:true,subtree:true});
installSettingsLayout();
