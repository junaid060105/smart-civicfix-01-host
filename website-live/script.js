// ═══════════════════════════════════════════════════════════
// Smart CivicFix — Main Script (Real-Time Data)
// ═══════════════════════════════════════════════════════════

function goLogin() {
  window.location.href = "login.html";
}

function goSignup() {
  window.location.href = "signup.html";
}

function goDashboard() {
  window.location.href = "dashboard.html";
}

// ── Navigation bar — auth-aware ──────────────────────────
function updateNavButtons() {
  const navButtons = document.getElementById("navButtons");
  if (!navButtons) return;

  if (Auth.isLoggedIn()) {
    const user = Auth.getCurrentUser();
    navButtons.innerHTML = `
      <span style="color: var(--text-muted); font-size: 14px; margin-right: 12px;">Hi, ${user.name.split(" ")[0]}</span>
      <button class="btn-ghost" onclick="window.location.href='dashboard.html'">Dashboard</button>
      <button class="btn-primary" onclick="Auth.signOut()">Sign out</button>
    `;
  } else {
    navButtons.innerHTML = `
      <button class="btn-ghost" onclick="goLogin()">Sign in</button>
      <button class="btn-primary" onclick="goSignup()">Create account</button>
    `;
  }
}

// ── Submit Issue (used by complaint.html) ──────────────────
async function submitIssue(event) {
  event.preventDefault();

  const user = Auth.getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const form = event.target;
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  // Generate a reference ID
  const refId = "CF-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);

  // Capture form values
  const issueType = form.querySelector("select").value || "General Issue";
  const description = form.querySelector("textarea").value || "";
  const location = form.querySelector("input[type='text']").value || "Not specified";
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  // Try to get geolocation
  let lat = null;
  let lng = null;

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch {
    // Geolocation unavailable or denied — use default coordinates
    lat = 18.5204;  // Default: Pune
    lng = 73.8567;
  }

  try {
    // Submit to API
    await API.submitIssue({
      userId: user.userId,
      refId: refId,
      type: issueType,
      description: description,
      location: location,
      lat: lat,
      lng: lng,
      status: "reported"
    });

    // Hide form fields
    const fields = form.querySelectorAll(".form-group, button[type='submit'], .subtitle");
    fields.forEach(el => el.style.display = "none");

    const heading = form.querySelector("h2");
    if (heading) heading.style.display = "none";

    // Populate summary card
    document.getElementById("refId").textContent = refId;
    document.getElementById("summaryType").textContent = issueType;
    document.getElementById("summaryLocation").textContent = location;
    document.getElementById("summaryDate").textContent = today;

    // Show success panel
    document.getElementById("submitSuccess").style.display = "block";

  } catch (err) {
    alert("Failed to submit issue: " + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
}

// ── Track Issue (used by track.html) ───────────────────────
async function searchIssue() {
  const input = document.querySelector(".search-input");
  const refId = input.value.trim();
  const statusCard = document.getElementById("trackResult");
  const noResult = document.getElementById("noResult");
  const searchBtn = document.getElementById("searchBtn");

  if (!refId) return;

  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";
  }
  if (statusCard) statusCard.style.display = "none";
  if (noResult) noResult.style.display = "none";

  try {
    const issue = await API.trackIssue(refId);

    if (!issue || !issue.refId) {
      if (noResult) noResult.style.display = "block";
      return;
    }

    // Populate status card
    document.getElementById("trackType").textContent = issue.type;
    document.getElementById("trackLocation").textContent = issue.location;
    document.getElementById("trackDate").textContent = new Date(issue.createdAt).toLocaleDateString("en-IN", {
      year: "numeric", month: "short", day: "numeric"
    });

    // Update status badge
    const badge = document.getElementById("trackBadge");
    badge.textContent = issue.status === "resolved" ? "Resolved" :
                        issue.status === "in-progress" ? "In Progress" : "Pending Review";
    badge.className = "status-badge " + (issue.status === "resolved" ? "resolved" :
                                          issue.status === "in-progress" ? "progress" : "pending");

    // Update progress steps
    const steps = document.querySelectorAll(".progress .step");
    steps.forEach(step => step.classList.remove("active", "completed"));

    if (issue.status === "reported") {
      steps[0].classList.add("active");
    } else if (issue.status === "in-progress") {
      steps[0].classList.add("completed");
      steps[1].classList.add("active");
    } else if (issue.status === "resolved") {
      steps[0].classList.add("completed");
      steps[1].classList.add("completed");
      steps[2].classList.add("active");
    }

    if (statusCard) statusCard.style.display = "block";

  } catch (err) {
    if (noResult) {
      noResult.textContent = "Issue not found. Check the reference ID and try again.";
      noResult.style.display = "block";
    }
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  }
}


// ═══════════════════════════════════════════════════════════
// DOM READY — INDEX PAGE DYNAMICS
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {

  // Update nav based on auth state
  updateNavButtons();

  // ── 1. Fetch Live Stats & Animate Counters ─────────────
  const counterReported = document.getElementById("counterReported");
  const counterResolved = document.getElementById("counterResolved");

  if (counterReported && counterResolved) {
    // Fetch real stats from API
    API.getStats()
      .then(stats => {
        counterReported.setAttribute("data-target", stats.totalReported || 0);
        counterResolved.setAttribute("data-target", stats.totalResolved || 0);
        initCounterAnimations();
      })
      .catch(() => {
        // Fallback to defaults if API is not yet connected
        counterReported.setAttribute("data-target", "14245");
        counterResolved.setAttribute("data-target", "9874");
        initCounterAnimations();
      });
  }

  function initCounterAnimations() {
    const counters = document.querySelectorAll(".counter-number[data-target]");
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-target"), 10);
        if (!target) { el.textContent = "0"; return; }
        const duration = 1800;
        let startTime = null;

        function tick(now) {
          if (!startTime) startTime = now;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target).toLocaleString("en-IN");
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString("en-IN");
        }

        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.3 });

    counters.forEach(c => observer.observe(c));
  }

  // ── 2. Scroll-linked Image Row ────────────────────────
  const galRow = document.getElementById("galRow");
  const galSection = document.querySelector(".gallery-scroll-container");
  let maxShift = 0;
  let currentShift = 0;
  let targetShift = 0;
  let rafId = null;

  function calcMax() {
    if (galRow && galSection) {
      maxShift = Math.max(0, galRow.scrollWidth - window.innerWidth);
    }
  }

  calcMax();
  window.addEventListener("resize", calcMax);

  window.addEventListener("scroll", () => {
    if (!galRow || !galSection) return;

    const rect = galSection.getBoundingClientRect();
    const sectionHeight = galSection.offsetHeight;
    const viewH = window.innerHeight;

    const scrolled = -rect.top;
    const scrollable = sectionHeight - viewH;

    const progress = Math.min(Math.max(scrolled / scrollable, 0), 1);
    targetShift = Math.round(progress * maxShift);

    if (!rafId) rafId = requestAnimationFrame(animate);
  });

  function animate() {
    currentShift += (targetShift - currentShift) * 0.08;

    if (Math.abs(targetShift - currentShift) < 0.5) {
      currentShift = targetShift;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(animate);
    }

    galRow.style.transform = `translateX(-${currentShift}px)`;
  }

  // ── 3. Leaflet India Map — Live Markers ──────────────────
  const mapEl = document.getElementById("indiaMap");

  if (mapEl && typeof L !== "undefined") {
    const map = L.map("indiaMap", {
      center: [20.5937, 78.9629],
      zoom: 4,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Custom marker icons by status
    function getMarkerColor(status) {
      if (status === "resolved") return "#10b981";
      if (status === "in-progress") return "#f59e0b";
      return "#3b82f6";
    }

    function createIcon(status) {
      const color = getMarkerColor(status);
      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: 14px; height: 14px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
    }

    // Fetch real issues from API
    API.getAllIssues()
      .then(issues => {
        if (issues && issues.length) {
          issues.forEach(d => {
            if (d.lat && d.lng) {
              const statusEmoji = d.status === "resolved" ? "✅" :
                                  d.status === "in-progress" ? "⏳" : "📋";
              L.marker([d.lat, d.lng], { icon: createIcon(d.status) })
                .addTo(map)
                .bindPopup(
                  `<b>${d.location}</b><br>${d.type}<br><span style="font-size:12px">${statusEmoji} ${d.status}</span>`
                );
            }
          });
        }
      })
      .catch(() => {
        // Fallback: show placeholder markers if API not yet connected
        const fallbackIssues = [
          { lat: 18.5204, lng: 73.8567, location: "Pune", type: "Pothole Fixed", status: "resolved" },
          { lat: 19.0760, lng: 72.8777, location: "Mumbai", type: "Waste Cleared", status: "resolved" },
          { lat: 28.7041, lng: 77.1025, location: "Delhi", type: "Streetlight Fixed", status: "resolved" },
          { lat: 12.9716, lng: 77.5946, location: "Bengaluru", type: "Pipeline Repaired", status: "resolved" },
          { lat: 22.5726, lng: 88.3639, location: "Kolkata", type: "Drainage Cleared", status: "in-progress" },
          { lat: 17.3850, lng: 78.4867, location: "Hyderabad", type: "Road Pothole", status: "in-progress" },
          { lat: 26.8467, lng: 80.9462, location: "Lucknow", type: "Broken Streetlight", status: "reported" }
        ];

        fallbackIssues.forEach(d => {
          const statusEmoji = d.status === "resolved" ? "✅" :
                              d.status === "in-progress" ? "⏳" : "📋";
          L.marker([d.lat, d.lng], { icon: createIcon(d.status) })
            .addTo(map)
            .bindPopup(
              `<b>${d.location}</b><br>${d.type}<br><span style="font-size:12px">${statusEmoji} ${d.status}</span>`
            );
        });
      });
  }

});