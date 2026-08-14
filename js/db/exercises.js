
import {getAll,put,del} from './database.js';
export async function ensureBuiltin(){
  const all=await getAll('exercises');
  if(all.length>0) return;
  const res=await fetch('./data/exercises.json');
  const list=await res.json();
  const now=Date.now();
  for(const e of list) await put('exercises',{...e,createdAt:now,updatedAt:now});
}
export const listExercises=()=>getAll('exercises');
export const saveExercise=(ex)=>put('exercises',ex);
export const deleteExercise=(id)=>del('exercises',id);
