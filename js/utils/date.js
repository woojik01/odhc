
export const todayStr=()=>new Date().toISOString().slice(0,10);
export const fmtDate=(s)=>{if(!s)return'';const d=new Date(s);return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;};
export const fmtDateKor=(s)=>{if(!s)return'';const d=new Date(s+'T00:00:00');return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;};
export const weekRange=(dateStr)=>{const d=new Date(dateStr+'T00:00:00');const day=d.getDay();const sun=new Date(d);sun.setDate(d.getDate()-day);const days=[];for(let i=0;i<7;i++){const dd=new Date(sun);dd.setDate(sun.getDate()+i);days.push(dd.toISOString().slice(0,10));}return days;};
export const monthMatrix=(y,m)=>{const first=new Date(y,m,1);const last=new Date(y,m+1,0);const start=first.getDay();const days=[];for(let i=0;i<start;i++)days.push(null);for(let d=1;d<=last.getDate();d++)days.push(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);return days;};
