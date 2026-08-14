
import {getAll,put,del} from './database.js';
export const listWorkouts=()=>getAll('workouts');
export async function getByDate(date){const all=await getAll('workouts');return all.find(w=>w.date===date)||null;}
export const saveWorkout=(w)=>put('workouts',w);
export const deleteWorkout=(id)=>del('workouts',id);
export async function lastSetsForExercise(exId){
  const all=await getAll('workouts');all.sort((a,b)=>b.date.localeCompare(a.date));
  for(const w of all){const ex=w.exercises.find(e=>e.exerciseId===exId);if(ex)return ex.sets;}
  return null;
}
export async function recentExercises(limit=10){
  const all=await getAll('workouts');all.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const seen=new Set();const res=[];
  for(const w of all){for(const ex of w.exercises){if(!seen.has(ex.exerciseId)){seen.add(ex.exerciseId);res.push({exerciseId:ex.exerciseId,name:ex.exerciseNameSnapshot,date:w.date,sets:ex.sets});if(res.length>=limit)return res;}}}
  return res;
}
