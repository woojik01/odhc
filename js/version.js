const APP_VERSION='ODHC v7';
const updateVersion=()=>{
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0 && el.textContent.includes('ODHC v3')){
      el.textContent=el.textContent.replaceAll('ODHC v3',APP_VERSION);
    }
  });
};
new MutationObserver(updateVersion).observe(document.body,{childList:true,subtree:true,characterData:true});
updateVersion();
