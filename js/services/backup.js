
import {getAll} from '../db/database.js';
export async function exportJSON(){const exercises=await getAll('exercises');const workouts=await getAll('workouts');const settings=await getAll('settings');return {version:1,exportedAt:new Date().toISOString(),exercises,workouts,settings};}
export function downloadJSON(obj){const date=new Date().toISOString().slice(0,10);const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ODHC_backup_${date}.json`;a.click();URL.revokeObjectURL(url);}
