
import {put,getAll,del} from '../db/database.js';
export async function importJSON(obj,mode='merge'){
  if(!obj||!obj.workouts)throw new Error('Invalid backup');
  if(mode==='overwrite'){
    const ex=await getAll('exercises');for(const e of ex)if(e.source==='custom')await del('exercises',e.id);
    const wo=await getAll('workouts');for(const w of wo)await del('workouts',w.id);
  }
  if(obj.exercises)for(const e of obj.exercises)await put('exercises',e);
  if(obj.workouts)for(const w of obj.workouts)await put('workouts',w);
  if(obj.settings)for(const s of obj.settings)await put('settings',s);
}
