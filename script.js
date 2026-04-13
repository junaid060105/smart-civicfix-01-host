function goLogin() {
  window.location.href = "login.html";
}

function goSignup() {
  window.location.href = "signup.html";
}

function goDashboard() {
  window.location.href = "dashboard.html";
}

function signup(event) {
  event.preventDefault();
  alert("Account created successfully!");
  window.location.href = "login.html";
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
}

// ----------------------------------------------------
// FRONTEND DYNAMIC INTERACTIONS (INDEX PAGE ONLY)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

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
    // lerp — 0.08 = smooth & satisfying, increase for snappier
    currentShift += (targetShift - currentShift) * 0.08;

    if (Math.abs(targetShift - currentShift) < 0.5) {
      currentShift = targetShift;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(animate);
    }

    galRow.style.transform = `translateX(-${currentShift}px)`;
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
      { lat: 18.5204, lng: 73.8567, city: "Pune", issue: "Pothole Fixed", status: "✅ Resolved" },
      { lat: 19.0760, lng: 72.8777, city: "Mumbai", issue: "Waste Cleared", status: "✅ Resolved" },
      { lat: 28.7041, lng: 77.1025, city: "Delhi", issue: "Streetlight Fixed", status: "✅ Resolved" },
      { lat: 12.9716, lng: 77.5946, city: "Bengaluru", issue: "Pipeline Repaired", status: "✅ Resolved" },
      { lat: 22.5726, lng: 88.3639, city: "Kolkata", issue: "Drainage Cleared", status: "⏳ In Progress" },
      { lat: 17.3850, lng: 78.4867, city: "Hyderabad", issue: "Road Pothole", status: "⏳ In Progress" },
      { lat: 26.8467, lng: 80.9462, city: "Lucknow", issue: "Broken Streetlight", status: "📋 Reported" }
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

        // Reverse geocoding using OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const addr = (data && data.display_name) ? data.display_name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            pickerMap._tempAddress = addr;
            displayText.textContent = "📍 " + addr.split(",")[0] + "...";
          })
          .catch(() => {
            pickerMap._tempAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            displayText.textContent = "📍 Location selected";
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
          displayText.textContent = "📍 " + addr.split(",")[0] + "...";
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




