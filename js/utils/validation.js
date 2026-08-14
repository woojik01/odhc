export const isValidWorkout=(w)=>w&&typeof w.date==='string'&&Array.isArray(w.exercises);
