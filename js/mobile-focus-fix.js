// Preserve mobile input focus when the app re-renders a container with innerHTML.
// This prevents the virtual keyboard from closing while typing in search fields.
(function(){
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if(!descriptor || !descriptor.set) return;

  const originalSet = descriptor.set;

  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value){
      const active = document.activeElement;
      const preserve = active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        (this.id === 'app' || this.id === 'ex-modal-content') &&
        this.contains(active);

      const snapshot = preserve ? {
        id: active.id,
        value: active.value,
        start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
      } : null;

      originalSet.call(this, value);

      if(snapshot && snapshot.id){
        requestAnimationFrame(() => {
          const next = document.getElementById(snapshot.id);
          if(!next) return;
          next.focus({preventScroll:true});
          if('value' in next && next.value !== snapshot.value) next.value = snapshot.value;
          if(snapshot.start !== null && typeof next.setSelectionRange === 'function'){
            try{ next.setSelectionRange(snapshot.start, snapshot.end); }catch(e){}
          }
        });
      }
    }
  });
})();
