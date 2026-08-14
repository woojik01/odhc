
import {getAll} from '../db/database.js';
export async function exportCSV(){
  const workouts=await getAll('workouts');const rows=[['date','duration','exerciseId','exerciseName','set_index','weight','reps','memo']];
  for(const w of workouts){for(const ex of w.exercises){ex.sets.forEach((s,i)=>rows.push([w.date,w.duration||'',ex.exerciseId,ex.exerciseNameSnapshot,i+1,s.weight,s.reps,ex.memo||'']));}}
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ODHC_export_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
}
