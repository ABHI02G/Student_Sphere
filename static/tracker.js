// static/tracker.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  // Sidebar toggle
  const menuToggle = $("menuToggle");
  const sidebar = $("sidebar");
  const pageContent = $("page-content");

  if (menuToggle && sidebar && pageContent) {
    menuToggle.addEventListener("click", () => {
      const open = sidebar.style.left === "0px";
      sidebar.style.left = open ? "-250px" : "0px";
      pageContent.style.marginLeft = open ? "0px" : "250px";
    });
  }

  // ---- DAILY PREDICTION ----
  async function predictDaily() {
    const main = $("daily-main");
    const sub = $("daily-sub");

    try {
      const res = await fetch("/api/predict_improvement");
      const data = await res.json();

      if (!res.ok) {
        main.textContent = "Prediction failed";
        sub.textContent = data.error || "";
        return;
      }

      const hrs = data.required_additional_study_hours ?? 0;
      main.textContent = `+${hrs} hrs/day needed`;
      sub.textContent = `Gap: ${data.predicted_grade_gap}`;
    } catch (err) {
      main.textContent = "Prediction failed";
      sub.textContent = "";
    }
  }

  // ---- WEEKLY PREDICTION ----
  async function predictWeekly() {
    const main = $("weekly-main");
    const sub = $("weekly-sub");

    try {
      const res = await fetch("/api/predict_week");
      const data = await res.json();

      if (!res.ok) {
        main.textContent = "Weekly error";
        sub.textContent = data.error || "";
        return;
      }

      const hrs = data.required_hours_week ?? 0;
      main.textContent = `+${hrs} hrs/week needed`;
      sub.textContent = `Gap: ${data.predicted_gap_week}`;
    } catch (err) {
      main.textContent = "Weekly failed";
      sub.textContent = "";
    }
  }

  // Bind click events
  $("dailyCircle").addEventListener("click", predictDaily);
  $("weeklyCircle").addEventListener("click", predictWeekly);

  // ---- HOURS VALIDATION ----
  const hoursInputs = ["studyHours", "sleepHours", "physicalHours", "leisureHours"];

  hoursInputs.forEach(id => {
    const field = $(id);
    if (!field) return;

    field.addEventListener("input", () => {
      let total = hoursInputs.reduce((sum, f) => sum + (Number($(f).value) || 0), 0);
      if (total > 24) {
        field.value = field.value - (total - 24);
        $("hourWarning").textContent = "Total cannot exceed 24 — adjusted.";
        setTimeout(() => $("hourWarning").textContent = "There are only 24 hours in a day.", 1500);
      }
    });
  });

  // ---- SAVE PROGRESS ----
  $("saveProgressBtn").addEventListener("click", async () => {
    const payload = {
      current_grade: Number($("currentGrade").value || 0),
      target_grade: Number($("targetGrade").value || 0),
      study: Number($("studyHours").value || 0),
      sleep: Number($("sleepHours").value || 0),
      physical: Number($("physicalHours").value || 0),
      leisure: Number($("leisureHours").value || 0)
    };

    const total = payload.study + payload.sleep + payload.physical + payload.leisure;

    if (total > 24) {
      alert("Total hours cannot exceed 24.");
      return;
    }

    try {
      const res = await fetch("/api/save_tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert("Progress saved!");
      } else {
        alert(data.error || "Error");
      }
    } catch {
      alert("Network error.");
    }
  });

  // ---- EXPORT CSV ----
  $("exportCsvBtn").addEventListener("click", async () => {
    try {
      const res = await fetch("/api/export_tracker_csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "tracker.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed.");
    }
  });
});
