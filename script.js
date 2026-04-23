function goLogin() {
  window.location.href = "login.html";
}

function goSignup() {
  window.location.href = "signup.html";
}

function goDashboard() {
  window.location.href = "dashboard.html";
}

// ── Social login (Google / Apple) ──────────────────────
function socialLogin(provider, event) {
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;

  // Show loading state
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Connecting to ${provider === 'google' ? 'Google' : 'Apple'}...
  `;

  // Simulate OAuth redirect delay
  setTimeout(() => {
    const name = provider === 'google' ? 'Google User' : 'Apple User';
    const email = provider === 'google' ? 'user@gmail.com' : 'user@icloud.com';
    
    localStorage.setItem('civicUser', JSON.stringify({
      name: name,
      email: email,
      provider: provider,
      loginTime: Date.now()
    }));
    
    // Also save to settings
    const settings = JSON.parse(localStorage.getItem('civicSettings') || '{}');
    settings.name = name;
    settings.email = email;
    localStorage.setItem('civicSettings', JSON.stringify(settings));

    window.location.href = 'dashboard.html';
  }, 1500);
}

function loginUser() {
  const emailInput = document.getElementById('loginEmail');
  if (emailInput) {
    const settings = JSON.parse(localStorage.getItem('civicSettings') || '{}');
    settings.email = emailInput.value;
    // Default name to email prefix if not set
    if (!settings.name) {
      settings.name = emailInput.value.split('@')[0];
    }
    localStorage.setItem('civicSettings', JSON.stringify(settings));
  }
  window.location.href = 'dashboard.html';
}

function signup(event) {
  event.preventDefault();

  const form = event.target;

  // Save user details to civicSettings
  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  
  if (nameInput && emailInput) {
    const settings = JSON.parse(localStorage.getItem('civicSettings') || '{}');
    settings.name = nameInput.value;
    settings.email = emailInput.value;
    localStorage.setItem('civicSettings', JSON.stringify(settings));
  }

  // Hide all form children
  Array.from(form.children).forEach(el => el.style.display = 'none');

  // Create inline success panel
  const success = document.createElement('div');
  success.className = 'signup-success';
  success.innerHTML = `
    <div style="text-align:center; animation: fadeUp 0.5s ease;">
      <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.12); display:inline-flex; align-items:center; justify-content:center; margin-bottom:18px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h2 style="margin:0 0 8px; font-size:22px; color:var(--navy,#0d2340);">Account Created!</h2>
      <p style="margin:0 0 20px; color:var(--text-muted,#64748b); font-size:14px; line-height:1.5;">
        Your citizen account has been registered successfully.<br>
        Redirecting to sign in…
      </p>
      <div style="width:100%; height:4px; background:#e2e8f0; border-radius:99px; overflow:hidden;">
        <div id="redirectBar" style="height:100%; width:0%; background:linear-gradient(90deg,#1a6fc4,#10b981); border-radius:99px; transition: width 2.5s ease;"></div>
      </div>
      <p style="margin-top:16px; font-size:13px; color:var(--text-muted,#64748b);">
        or <a href="login.html" style="color:var(--blue,#1a6fc4); font-weight:600; text-decoration:none;">sign in now →</a>
      </p>
    </div>
  `;
  form.appendChild(success);

  // Animate progress bar and redirect
  requestAnimationFrame(() => {
    document.getElementById('redirectBar').style.width = '100%';
  });
  setTimeout(() => { window.location.href = 'login.html'; }, 2600);
}

// ── "Other" Issue Type Toggle ──────────────────────────────
function toggleOtherField(select) {
  const otherInput = document.getElementById("otherIssueInput");
  if (select.value === "Other") {
    otherInput.style.display = "block";
    otherInput.required = true;
    otherInput.focus();
  } else {
    otherInput.style.display = "none";
    otherInput.required = false;
    otherInput.value = "";
  }
}

// ── Image Picker (used by complaint.html) ──────────────────
let selectedImageFile = null;

function openGallery() {
  document.getElementById("fileGallery").click();
}

function handleImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedImageFile = file;

  const reader = new FileReader();
  reader.onload = function (e) {
    const previewImg = document.getElementById("previewImg");
    previewImg.src = e.target.result;
    document.getElementById("imagePreview").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function openCamera() {
  // Try WebRTC first (works on desktop + modern mobile browsers)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("cameraFeed");

    modal.classList.add("active");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(function (stream) {
        video.srcObject = stream;
      })
      .catch(function () {
        // WebRTC failed — fall back to native file input
        modal.classList.remove("active");
        document.getElementById("fileCamera").click();
      });
  } else {
    // No WebRTC support — use native file input (mobile fallback)
    document.getElementById("fileCamera").click();
  }
}

function closeCamera() {
  const modal = document.getElementById("cameraModal");
  const video = document.getElementById("cameraFeed");

  // Stop all tracks
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(function (track) { track.stop(); });
    video.srcObject = null;
  }

  modal.classList.remove("active");
}

function capturePhoto() {
  const video = document.getElementById("cameraFeed");
  const canvas = document.getElementById("cameraCanvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  // Convert canvas to blob and show preview
  canvas.toBlob(function (blob) {
    selectedImageFile = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });

    const previewImg = document.getElementById("previewImg");
    previewImg.src = URL.createObjectURL(blob);
    document.getElementById("imagePreview").style.display = "block";

    closeCamera();
  }, "image/jpeg", 0.9);
}

function removeImage() {
  selectedImageFile = null;
  document.getElementById("previewImg").src = "";
  document.getElementById("imagePreview").style.display = "none";
  document.getElementById("fileGallery").value = "";
  document.getElementById("fileCamera").value = "";
}

function submitIssue(event) {
  event.preventDefault();

  // ── 3-issue limit (only count active / non-resolved reports) ────────────────────────────────────
  const existingReports = JSON.parse(localStorage.getItem("civicReports") || "[]");
  const activeReports = existingReports.filter(r => r.status !== 'resolved');
  if (activeReports.length >= 3) {
    const errBox = document.getElementById("errorLimitMsg");
    if (errBox) {
      errBox.style.display = "block";
      errBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  // Generate a random reference ID
  const refId = "CF-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);

  const form = event.target;

  // Capture form values before hiding
  const selectVal = form.querySelector("select").value || "General Issue";
  const issueType = selectVal === "Other"
    ? (document.getElementById("otherIssueInput").value || "Other Issue")
    : selectVal;
  const locInput = document.getElementById("locationInput");
  const location = locInput ? locInput.value : (form.querySelector("input[type='text']").value || "Not specified");
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  // ── Convert image to base64 for storage ─────────────────────
  function saveReport(imageBase64) {
    const report = {
      refId: refId,
      issueType: issueType,
      location: location,
      date: today,
      status: "reported",
      timestamp: Date.now(),
      image: imageBase64 || null
    };

    const existing = JSON.parse(localStorage.getItem("civicReports") || "[]");
    existing.unshift(report);
    localStorage.setItem("civicReports", JSON.stringify(existing));

    // ── Award +20 civic points ─────────────────────────
    let currentPts = parseInt(localStorage.getItem("civicPoints")) || 0;
    currentPts += 20;
    localStorage.setItem("civicPoints", String(currentPts));

    showSuccess();
  }

  function showSuccess() {

  // Hide all form fields and the submit button
  const fields = form.querySelectorAll(".form-group, button[type='submit'], .subtitle");
  fields.forEach(el => el.style.display = "none");

  // Hide the heading
  const heading = form.querySelector("h2");
  if (heading) heading.style.display = "none";

  // Populate summary card
  document.getElementById("refId").textContent = refId;
  document.getElementById("summaryType").textContent = issueType;
  document.getElementById("summaryLocation").textContent = location;
  document.getElementById("summaryDate").textContent = today;

  // Show success panel
  document.getElementById("submitSuccess").style.display = "block";

  // ── Confetti burst ──────────────────────────────────
  const canvas = document.getElementById("confettiCanvas");
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const colors = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 100,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10
      });
    }
    let frames = 0;
    function drawConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rot += p.rotV;
      });
      frames++;
      if (frames < 120) requestAnimationFrame(drawConfetti);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.remove(); }
    }
    drawConfetti();
  }
  } // end showSuccess

  // ── Read image and save report ────────────────────────────
  if (selectedImageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement("canvas");
        const maxW = 400;
        const scale = maxW / img.width;
        c.width = maxW;
        c.height = img.height * scale;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        saveReport(c.toDataURL("image/jpeg", 0.6));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedImageFile);
  } else {
    saveReport(null);
  }
}

// ----------------------------------------------------
// FRONTEND DYNAMIC INTERACTIONS (INDEX PAGE ONLY)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  // ── 0. Hamburger Menu Toggle ─────────────────────
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navButtons = document.getElementById('navButtons');
  if (hamburgerBtn && navButtons) {
    hamburgerBtn.addEventListener('click', () => {
      navButtons.classList.toggle('open');
    });
  }

  // ── 0b. Gallery "View All" Toggle ─────────────────
  window.toggleGallery = function () {
    const grid = document.getElementById('galleryGrid');
    const btn = document.getElementById('viewAllBtn');
    const chevron = document.getElementById('viewAllChevron');

    if (grid.classList.contains('collapsed')) {
      grid.classList.remove('collapsed');
      btn.childNodes[0].nodeValue = 'View Less ';
      chevron.style.transform = 'rotate(180deg)';
    } else {
      grid.classList.add('collapsed');
      btn.childNodes[0].nodeValue = 'View All ';
      chevron.style.transform = 'rotate(0deg)';
      // scroll back up slightly so the user sees the start of gallery
      grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ── 1. Animated Counters ─────────────────────────
  // Runs once when the .hero-counters block enters the viewport
  const counters = document.querySelectorAll(".counter-number[data-target]");

  if (counters.length) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-target"), 10);
        const duration = 1800; // ms
        let startTime = null;

        function tick(now) {
          if (!startTime) startTime = now;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target).toLocaleString("en-IN");
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString("en-IN");
        }

        requestAnimationFrame(tick);
        obs.unobserve(el); // only animate once
      });
    }, { threshold: 0.3 });

    counters.forEach(c => observer.observe(c));
  }


  // ── 3. Leaflet India Map ──────────────────────────
  const mapEl = document.getElementById("indiaMap");

  if (mapEl && typeof L !== "undefined") {
    const map = L.map("indiaMap", {
      center: [20.5937, 78.9629],
      zoom: 4,
      scrollWheelZoom: false // don't capture page scroll
    });

    // CartoDB Voyager — clean, modern, readable tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Placeholder "live" markers – replace with backend API data later
    const issues = [
      { lat: 18.5204, lng: 73.8567, city: "Pune", issue: "Pothole Fixed", status: "Resolved" },
      { lat: 19.0760, lng: 72.8777, city: "Mumbai", issue: "Waste Cleared", status: "Resolved" },
      { lat: 28.7041, lng: 77.1025, city: "Delhi", issue: "Streetlight Fixed", status: "Resolved" },
      { lat: 12.9716, lng: 77.5946, city: "Bengaluru", issue: "Pipeline Repaired", status: "Resolved" },
      { lat: 22.5726, lng: 88.3639, city: "Kolkata", issue: "Drainage Cleared", status: "In Progress" },
      { lat: 17.3850, lng: 78.4867, city: "Hyderabad", issue: "Road Pothole", status: "In Progress" },
      { lat: 26.8467, lng: 80.9462, city: "Lucknow", issue: "Broken Streetlight", status: "Reported" }
    ];

    issues.forEach(d => {
      L.marker([d.lat, d.lng])
        .addTo(map)
        .bindPopup(
          `<b>${d.city}</b><br>${d.issue}<br><span style="font-size:12px">${d.status}</span>`
        );
    });
  }

  // ── 4. Location Picker Map (Complaint Form Modal) ──────────────────
  let pickerMap = null;
  let pickerMarker = null;

  window.openMapModal = function () {
    const modal = document.getElementById("mapModal");
    if (!modal) return;

    modal.classList.add("active");

    if (!pickerMap && typeof L !== "undefined") {
      // Default to a central view
      pickerMap = L.map("locationPickerMap").setView([18.5204, 73.8567], 12); // Center on Pune by default

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
      }).addTo(pickerMap);

      pickerMap.on("click", function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (pickerMarker) {
          pickerMarker.setLatLng(e.latlng);
        } else {
          pickerMarker = L.marker(e.latlng).addTo(pickerMap);
        }

        const displayText = document.getElementById("locationDisplayText");
        displayText.textContent = "Fetching address...";
        const searchInput = document.getElementById("mapSearchInput");

        // Reverse geocoding using OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const addr = (data && data.display_name) ? data.display_name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            pickerMap._tempAddress = addr;
            displayText.textContent = addr.split(",")[0] + "...";
            if (searchInput) searchInput.value = addr;
          })
          .catch(() => {
            const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            pickerMap._tempAddress = fallback;
            displayText.textContent = "Location selected";
            if (searchInput) searchInput.value = fallback;
          });
      });
    }

    // Give modal display transition time before rendering map
    setTimeout(() => { if (pickerMap) pickerMap.invalidateSize(); }, 300);
  };

  window.closeMapModal = function () {
    const modal = document.getElementById("mapModal");
    if (modal) modal.classList.remove("active");
  };

  window.confirmMapLocation = function () {
    const hiddenInput = document.getElementById("locationInput");
    const displayText = document.getElementById("locationDisplayText");

    if (pickerMap && pickerMap._tempAddress) {
      hiddenInput.value = pickerMap._tempAddress;
      displayText.textContent = pickerMap._tempAddress.length > 35 ? pickerMap._tempAddress.substring(0, 35) + "..." : pickerMap._tempAddress;
      displayText.style.color = "var(--navy)";
      document.querySelector(".location-icon").style.color = "#ec4899"; // Reset color
    } else if (!hiddenInput.value) {
      alert("Please tap on the map to select a location first.");
      return;
    }

    closeMapModal();
  };

  window.searchMapLocation = function () {
    if (!pickerMap) return;
    const q = document.getElementById("mapSearchInput").value;
    if (!q) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = data[0].lat;
          const lon = data[0].lon;
          pickerMap.setView([lat, lon], 14);

          if (pickerMarker) {
            pickerMarker.setLatLng([lat, lon]);
          } else {
            pickerMarker = L.marker([lat, lon]).addTo(pickerMap);
          }
          const addr = data[0].display_name;
          pickerMap._tempAddress = addr;

          const displayText = document.getElementById("locationDisplayText");
          displayText.textContent = addr.split(",")[0] + "...";
        } else {
          alert("Location not found. Try a different search term.");
        }
      })
      .catch(err => {
        console.error(err);
        alert("Search failed. Try tapping on the map.");
      });
  };

});




