/* js/userInfo.js
   Centralized PFP / XP / Level updater that reads from localStorage and syncs across pages.
   - Integrates with your existing `profile` (pscript uses 'profile') and 'xp'/'level' keys.
   - Listens for storage events to auto-update across tabs.
   - Exposes updateUserInfo({xp,level,pic}) to programmatically update.
*/

(function(){
  const PFP_ID = "userPfpUnified";
  const LV_ID = "levelUnified";
  const XP_FILL_ID = "xpFillUnified";
  const XP_TEXT_ID = "xpTextUnified";

  function getStored(){
    let profile = null;
    try{ profile = JSON.parse(localStorage.getItem('profile') || 'null'); } catch(e){ profile = null; }
    const xp = Number(localStorage.getItem('xp') || 0);
    const level = Number(localStorage.getItem('level') || 1);
    return { profile, xp, level };
  }

  function applyToDom({profile, xp, level}){
    const pfp = document.getElementById(PFP_ID);
    const lv = document.getElementById(LV_ID);
    const xpFill = document.getElementById(XP_FILL_ID);
    const xpText = document.getElementById(XP_TEXT_ID);

    if(pfp){
      if(profile && profile.pic) pfp.src = profile.pic;
      else if(!pfp.src) pfp.src = (typeof window.defaultPfpUrl !== 'undefined') ? window.defaultPfpUrl : (profile && profile.pic) || '/static/pfp.jpg';
    }
    if(lv) lv.innerText = 'Lv ' + (Number(level) || 0);
    if(xpFill){
      // compute progress relative to next level: use same formula as pscript if available
      // try to compute using a small growth formula; fallback to simple %.
      const cur = Number(xp) || 0;
      let next = 100;
      try{
        // use same xpForLevel if present on window (pscript defines it inside but not globally)
        if(window.xpForLevel) next = window.xpForLevel(Number(level)+1);
        else next = 100 + (Number(level)-0)*60;
      }catch(e){ next = 100; }
      // compute base for current level
      let base = 0;
      try{ if(window.xpForLevel) base = window.xpForLevel(Number(level)); } catch(e){ base = 0; }
      const progress = Math.max(0, Math.min(1, (cur - base) / Math.max(1, (next - base))));
      xpFill.style.width = Math.round(progress*100) + "%";
    }
    if(xpText) xpText.innerText = (Number(xp) || 0) + " XP";
  }

  // initial apply
  applyToDom(getStored());

  // expose update function
  window.updateUserInfo = function({ profile, xp, level } = {}){
    try{
      if(profile) localStorage.setItem('profile', JSON.stringify(profile));
      if(typeof xp !== 'undefined') localStorage.setItem('xp', String(xp));
      if(typeof level !== 'undefined') localStorage.setItem('level', String(level));
    }catch(e){}
    applyToDom(getStored());
    // broadcast custom event
    window.dispatchEvent(new CustomEvent('userInfo:changed', { detail: getStored() }));
  };

  // listen to storage events (other tabs)
  window.addEventListener('storage', function(e){
    if(['profile','xp','level'].includes(e.key)) applyToDom(getStored());
  });

  // If profile upload operations or pscript updates occur in-page via JS, listen to custom events too
  window.addEventListener('user:profileSaved', () => applyToDom(getStored()));
  window.addEventListener('user:xpChanged', () => applyToDom(getStored()));

})();
