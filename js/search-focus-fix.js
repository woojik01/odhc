// Mobile search keyboard/focus preservation.
// Some views re-render their container with innerHTML on every search keystroke.
// Keep the replacement search input focused so mobile keyboards stay open.
(function(){
  const SEARCH_IDS = new Set(['ex-search', 'ex-search-main']);
  let lastSearchId = null;
  let lastValue = '';
  let selectionStart = null;
  let selectionEnd = null;
  let restoring = false;

  function isSearch(el){
    return !!el && el.tagName === 'INPUT' && SEARCH_IDS.has(el.id);
  }

  function remember(el){
    if(!isSearch(el)) return;
    lastSearchId = el.id;
    lastValue = el.value;
    selectionStart = el.selectionStart;
    selectionEnd = el.selectionEnd;
  }

  document.addEventListener('focusin', e => remember(e.target), true);
  document.addEventListener('input', e => {
    if(!isSearch(e.target)) return;
    remember(e.target);
    restore();
  }, true);

  function restore(){
    if(restoring || !lastSearchId) return;
    const input = document.getElementById(lastSearchId);
    if(!input) return;
    restoring = true;
    try{
      if(input.value !== lastValue) input.value = lastValue;
      input.focus({preventScroll:true});
      const start = selectionStart == null ? input.value.length : Math.min(selectionStart, input.value.length);
      const end = selectionEnd == null ? start : Math.min(selectionEnd, input.value.length);
      try{ input.setSelectionRange(start, end); }catch(_){ }
    }finally{
      restoring = false;
    }
  }

  const observer = new MutationObserver(() => {
    if(!lastSearchId) return;
    restore();
    requestAnimationFrame(restore);
  });

  function start(){
    observer.observe(document.body, {subtree:true, childList:true});
  }
  if(document.body) start();
  else document.addEventListener('DOMContentLoaded', start, {once:true});
})();
