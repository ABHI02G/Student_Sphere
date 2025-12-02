/* ============================================================
   SCROLL REVEAL — Ultra Smooth + Staggered + Eased Motion
   ============================================================ */
(function () {
  const reveals = document.querySelectorAll(".reveal");

  function reveal() {
    let delay = 0;

    reveals.forEach((el) => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;

      if (elementTop < windowHeight - 120) {
        setTimeout(() => {
          el.classList.add("active");
        }, delay);

        delay += 120; // stagger effect
      }
    });
  }

  window.addEventListener("scroll", reveal);
  window.addEventListener("load", reveal);
})();
  

/* ============================================================
   NAVBAR SHRINK — Smooth Fade + Scale
   ============================================================ */
(function () {
  const navbar = document.querySelector(".navbar");

  function shrink() {
    if (window.scrollY > 60) {
      navbar.style.transition = "all 0.45s cubic-bezier(.25,.46,.45,.94)";
      navbar.classList.add("shrink");
    } else {
      navbar.style.transition = "all 0.45s cubic-bezier(.25,.46,.45,.94)";
      navbar.classList.remove("shrink");
    }
  }

  window.addEventListener("scroll", shrink);
  window.addEventListener("load", shrink);
})();


/* ============================================================
   CONTACT FORM — Soft Toast Notification
   ============================================================ */
function handleContactSubmit(e) {
  e.preventDefault();
  const name = e.target.name.value.trim();
  showToast(`Thanks, ${name || "student"}! Message sent.`);
  e.target.reset();
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.textContent = text;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "22px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.78)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "14px",
    zIndex: "9999",
    fontSize: "0.95rem",
    opacity: "0",
    transition: "opacity 0.5s ease"
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 2200);
}


/* ============================================================
   PARALLAX TILT — Smooth, Dampened Motion
   ============================================================ */
(function () {
  const container = document.querySelector(".parallax-container");
  const image = document.querySelector(".parallax-img");

  if (!container || !image) return;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  function animateTilt() {
    currentX += (targetX - currentX) * 0.12; // easing movement
    currentY += (targetY - currentY) * 0.12;

    image.style.transform =
      `rotateX(${currentY}deg) rotateY(${currentX}deg) scale(1.05)`;

    requestAnimationFrame(animateTilt);
  }

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    targetX = ((x / rect.width) - 0.5) * 18;
    targetY = ((y / rect.height) - 0.5) * -18;
  });

  container.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
  });

  animateTilt();
})();
/* ============================================================
   ULTRA SMOOTH SCROLLING FOR NAV LINKS
   ============================================================ */

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function(e) {
    const href = this.getAttribute('href');

    if (href.startsWith("#")) {
      e.preventDefault();

      const target = document.querySelector(href);
      if (!target) return;

      smoothScrollTo(target.offsetTop - 80, 900); // Smooth scroll with offset
    }
  });
});

// Easing scroll animation
function smoothScrollTo(target, duration = 800) {
  const start = window.scrollY;
  const startTime = performance.now();

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth slowdown
    const ease = 1 - Math.pow(1 - progress, 3);

    window.scrollTo(0, start + (target - start) * ease);

    if (progress < 1) requestAnimationFrame(animateScroll);
  }

  requestAnimationFrame(animateScroll);
}
