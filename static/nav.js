/* js/nav.js
   Unified nav/sidebar toggler and safe hookup across pages.
   - Replaces previous click handlers on the #menuToggle element (clone trick)
   - Exposes toggle API (window.unifiedNavToggle) for other scripts if needed
*/

(function(){
  // safe DOM refs
  const MENU_ID = "menuToggle";
  const SIDEBAR_ID = "sidebar";
  const NAV_CLS = "unified-navbar";
  const SB_CLS = "unified-sidebar";

  // Find elements (some pages use different placements). We'll prefer existing IDs.
  let menuBtn = document.getElementById(MENU_ID);
  let sidebar = document.getElementById(SIDEBAR_ID);

  // If menuBtn exists and has other listeners, remove them by replacing with a clone.
  if(menuBtn){
    const cloned = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(cloned, menuBtn);
    menuBtn = cloned;
  }

  // If a sidebar element exists but it is an older structure, we still use it.
  if(!sidebar){
    // create and append sidebar if missing so all pages have it.
    sidebar = document.createElement("aside");
    sidebar.id = SIDEBAR_ID;
    sidebar.className = SB_CLS;
    document.body.appendChild(sidebar);
  }
  // Ensure class names are set for styling compatibility
  sidebar.classList.add(SB_CLS);

  // Build unified sidebar links if it's empty or not our unified markup.
  function buildSidebarLinks(){
    const links = [
      {href:"/dashboard", label:"Dashboard"},
      {href:"/profile", label:"Profile"},
      {href:"/homework", label:"Homework"},
      {href:"/quiz", label:"Quiz"},
      {href:"/meditation", label:"Meditation"},
      {href:"/tracker", label:"Tracker"},
      {href:"/logout", label:"Logout"}
    ];
    // if sidebar contains many children (page-specific), replace content with universal links
    const container = document.createElement("div");
    container.className = "links";
    links.forEach(l=>{
      const a = document.createElement("a");
      a.href = l.href;
      a.innerText = l.label;
      container.appendChild(a);
    });
    // Clear and append
    sidebar.innerHTML = "";
    sidebar.appendChild(container);
  }

  // If sidebar currently looks like our unified or if it has very few children, rebuild it.
  if(!sidebar.querySelector(".links") || sidebar.children.length < 3){
    buildSidebarLinks();
  } else {
    // Replace with unified structure to ensure identical across pages.
    buildSidebarLinks();
  }

  // Ensure there's a menu button; if not, create one in the navbar area
  if(!menuBtn){
    const leftArea = document.querySelector(".left") || document.body;
    const btn = document.createElement("button");
    btn.id = MENU_ID;
    btn.className = "unified-toggle";
    btn.setAttribute("aria-label","Toggle menu");
    btn.innerHTML = '<span class="bar"></span>';
    // place at top of body as fallback
    document.body.insertBefore(btn, document.body.firstChild);
    menuBtn = btn;
  }

  // add unified classes to an existing navbar or create a thin one if missing
  let navbar = document.querySelector(".unified-navbar");
  if(!navbar){
    // try to find header / .navbar
    navbar = document.querySelector("header.navbar, .navbar, header.header") || document.createElement("header");
    navbar.classList.add("unified-navbar");
    // ensure left and right containers exist
    if(!navbar.querySelector(".left")){
      const left = document.createElement("div"); left.className = "left"; navbar.insertBefore(left, navbar.firstChild);
    }
    if(!navbar.querySelector(".right")){
      const right = document.createElement("div"); right.className = "right"; navbar.appendChild(right);
    }
    if(!navbar.querySelector(".title")){
      const t = document.createElement("div"); t.className = "title"; t.innerText = document.title || "Student Sphere";
      navbar.appendChild(t);
    }
    // if navbar was newly created and attached to an existing header element, ensure it's in DOM
    if(!document.body.contains(navbar)) document.body.insertBefore(navbar, document.body.firstChild);
  }
  navbar.classList.add("unified-navbar");

  // Populate left area with our menu button (if not already inside)
  const leftArea = navbar.querySelector(".left");
  if(leftArea && !leftArea.contains(menuBtn)){
    menuBtn.classList.add("unified-toggle");
    menuBtn.innerHTML = '<span class="bar"></span>';
    leftArea.appendChild(menuBtn);
  }

  // Ensure center title is present and centered
  const titleEl = navbar.querySelector(".title");
  if(titleEl){
    titleEl.innerText = titleEl.innerText || document.title || "Student Sphere";
  } else {
    const t = document.createElement("div"); t.className = "title"; t.innerText = document.title || "Student Sphere";
    navbar.appendChild(t);
  }

  // Right meta: pfp / xp / level (create only if not present)
  const right = navbar.querySelector(".right");
  if(right && !right.querySelector(".nav-pfp")){
    const pfp = document.createElement("img");
    pfp.id = "userPfpUnified";
    pfp.className = "nav-pfp";
    pfp.alt = "profile";
    pfp.src = ""; // userInfo.js will populate
    const lvxp = document.createElement("div");
    lvxp.className = "lvxp";
    lvxp.innerHTML = `<div id="levelUnified">Lv 0</div>
                      <div class="xp-mini"><div id="xpFillUnified" class="xp-fill" style="width:0%"></div></div>
                      <div id="xpTextUnified">0 XP</div>`;
    right.appendChild(pfp);
    right.appendChild(lvxp);
  }

  // Main toggle behavior
  function setOpenState(open){
    if(open){
      sidebar.classList.add("open");
      menuBtn.classList.add("active");
      menuBtn.setAttribute("aria-expanded","true");
    } else {
      sidebar.classList.remove("open");
      menuBtn.classList.remove("active");
      menuBtn.setAttribute("aria-expanded","false");
    }
  }

  // initialize from current class
  setOpenState(!!sidebar.classList.contains("open"));

  // attach click
  menuBtn.addEventListener("click", (e) => {
    const isOpen = sidebar.classList.contains("open");
    setOpenState(!isOpen);
    // Also dispatch a custom event so other scripts can react if they want:
    window.dispatchEvent(new CustomEvent("unifiedNav:toggle", { detail: { open: !isOpen } }));
  });

  // expose API
  window.unifiedNavToggle = function(open){
    setOpenState(Boolean(open));
  };

  // close sidebar when clicking outside (on narrow screens)
  document.addEventListener("click", function(ev){
    if(window.innerWidth > 1000) return;
    if(!sidebar.classList.contains("open")) return;
    const inside = sidebar.contains(ev.target) || menuBtn.contains(ev.target) || navbar.contains(ev.target);
    if(!inside) setOpenState(false);
  });

  // On Escape key, close sidebar
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") setOpenState(false); });

})();
