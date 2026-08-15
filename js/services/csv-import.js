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
