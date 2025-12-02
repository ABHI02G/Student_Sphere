const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const userPfp = document.getElementById("userPfp");
const content = document.querySelector(".page-content");

// Sidebar toggle
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  content.classList.toggle("active");
  menuToggle.textContent = sidebar.classList.contains("active") ? "✖" : "☰";
});

// Glow effect on profile
userPfp.addEventListener("click", () => {
  userPfp.classList.toggle("glow");
});
