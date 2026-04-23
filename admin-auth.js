function isAuthenticated() {
  return localStorage.getItem('adminLoggedIn') === 'true';
}

function setAuthentication(username, remember) {
  localStorage.setItem('adminLoggedIn', 'true');
  localStorage.setItem('adminUser', username);
  localStorage.setItem('loginTime', Date.now().toString());

  // Store login attempt data
  storeLoginAttempt(username, 'admin123'); // Note: In production, never store passwords!

  if (remember) {
    localStorage.setItem('rememberLogin', 'true');
  } else {
    localStorage.removeItem('rememberLogin');
  }
}

function clearAuthentication() {
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('loginTime');
  localStorage.removeItem('rememberLogin');
}

function redirectToLogin() {
  window.location.href = 'admin-login.html';
}

function redirectToDashboard() {
  window.location.href = 'admin-index.html';
}

function validateAdminCredentials(username, password) {
  return (username === 'admin' || username === 'admin@example.com') && password === 'admin123';
}

function storeLoginAttempt(username, password) {
  const loginData = {
    username: username,
    password: password, // WARNING: Never store passwords in production!
    timestamp: new Date().toISOString(),
    ipAddress: 'Unknown', // In a real app, you'd get this from the server
    userAgent: navigator.userAgent,
    success: true
  };

  // Get existing login attempts
  let loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');

  // Add new attempt
  loginAttempts.push(loginData);

  // Keep only last 100 attempts to prevent storage bloat
  if (loginAttempts.length > 100) {
    loginAttempts = loginAttempts.slice(-100);
  }

  // Store back to localStorage
  localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
}

function storeFailedLoginAttempt(username, password) {
  const loginData = {
    username: username || 'Unknown',
    password: password || 'Unknown', // WARNING: Never store passwords in production!
    timestamp: new Date().toISOString(),
    ipAddress: 'Unknown', // In a real app, you'd get this from the server
    userAgent: navigator.userAgent,
    success: false
  };

  // Get existing login attempts
  let loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');

  // Add new attempt
  loginAttempts.push(loginData);

  // Keep only last 100 attempts to prevent storage bloat
  if (loginAttempts.length > 100) {
    loginAttempts = loginAttempts.slice(-100);
  }

  // Store back to localStorage
  localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
}

function getComplaints() {
  return JSON.parse(localStorage.getItem('complaints') || '[]');
}

function saveComplaints(complaints) {
  localStorage.setItem('complaints', JSON.stringify(complaints));
}

function initializeComplaints() {
  let complaints = getComplaints();

  if (!complaints || complaints.length === 0) {
    complaints = [
      {
        id: 123,
        title: 'Broken Streetlight',
        description: 'Main Street light is flickering.',
        status: 'pending',
        timestamp: '2026-04-22T10:00:00Z'
      },
      {
        id: 124,
        title: 'Pothole on 5th Ave',
        description: 'Large pothole causing traffic issues.',
        status: 'pending',
        timestamp: '2026-04-22T11:30:00Z'
      }
    ];
    saveComplaints(complaints);
  }
}

function updateComplaintStats() {
  const complaints = getComplaints();
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'pending').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  const totalEl = document.getElementById('total');
  const pendingEl = document.getElementById('pending');
  const resolvedEl = document.getElementById('resolved');

  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (resolvedEl) resolvedEl.textContent = resolved;
}

function addActivity(message, type) {
  const recent = document.querySelector('.recent-activity');
  if (!recent) return;

  const activity = document.createElement('div');
  activity.className = 'activity-item';
  const icon = type === 'resolved' ? 'check' : type === 'remove' ? 'trash' : 'plus';
  const badgeClass = type === 'resolved' ? 'resolved' : type === 'remove' ? 'resolved' : 'new';

  activity.innerHTML = `
    <div class="activity-icon ${badgeClass}">
      <i class="fas fa-${icon}"></i>
    </div>
    <div>
      <strong>${message}</strong>
      <br>
      <small>Just now</small>
    </div>
  `;

  const first = recent.querySelector('.activity-item');
  if (first) {
    recent.insertBefore(activity, first);
  } else {
    recent.appendChild(activity);
  }
}

function renderComplaints() {
  const complaints = getComplaints();
  const list = document.getElementById('complaints-list');

  if (!list) return;

  if (complaints.length === 0) {
    list.innerHTML = '<p>No complaints in the queue.</p>';
    return;
  }

  list.innerHTML = complaints.map(complaint => {
    const resolved = complaint.status === 'resolved';
    return `
      <div class="complaint-item" data-id="${complaint.id}">
        <div class="complaint-meta">
          <strong>${complaint.title}</strong>
          <small>${complaint.description}</small>
          <small>${complaint.timestamp}</small>
        </div>
        <div class="complaint-actions">
          <button class="button-small resolve" data-action="resolve" data-id="${complaint.id}" ${resolved ? 'disabled' : ''}>
            ${resolved ? 'Resolved' : 'Mark Resolved'}
          </button>
          <button class="button-small remove" data-action="remove" data-id="${complaint.id}">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-action="resolve"]').forEach(button => {
    button.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'), 10);
      markComplaintResolved(id);
    });
  });

  list.querySelectorAll('[data-action="remove"]').forEach(button => {
    button.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'), 10);
      removeComplaint(id);
    });
  });
}

function markComplaintResolved(id) {
  const complaints = getComplaints();
  const complaint = complaints.find(c => c.id === id);
  if (!complaint || complaint.status === 'resolved') return;

  complaint.status = 'resolved';
  saveComplaints(complaints);
  
  // Award +50 civic points to the user upon resolution
  let userPts = parseInt(localStorage.getItem("civicPoints")) || 0;
  userPts += 50;
  localStorage.setItem("civicPoints", String(userPts));

  renderComplaints();
  updateComplaintStats();
  addActivity(`Complaint #${id} resolved (+50 pts awarded)`, 'resolved');
}

function removeComplaint(id) {
  let complaints = getComplaints();
  complaints = complaints.filter(c => c.id !== id);
  saveComplaints(complaints);
  renderComplaints();
  updateComplaintStats();
  addActivity(`Complaint #${id} removed`, 'remove');
}

function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function initializeUsers() {
  let users = getUsers();

  if (!users || users.length === 0) {
    users = [
      {
        id: 1,
        username: 'johndoe',
        email: 'johndoe@example.com',
        password: 'password123',
        civicPoints: 1250,
        status: 'Active'
      },
      {
        id: 2,
        username: 'janesmith',
        email: 'janesmith@example.com',
        password: 'mysecurepass',
        civicPoints: 980,
        status: 'Active'
      },
      {
        id: 3,
        username: 'alex88',
        email: 'alex88@example.com',
        password: 'civichero',
        civicPoints: 1730,
        status: 'Verified'
      },
      {
        id: 4,
        username: 'mariaw',
        email: 'mariaw@example.com',
        password: 'maria@2026',
        civicPoints: 1100,
        status: 'Active'
      }
    ];
    saveUsers(users);
  }

  return users;
}

function renderUsers() {
  const users = getUsers();
  const tbody = document.getElementById('users-table-body');

  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; color: #6b7280;">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr data-id="${user.id}">
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.password}</td>
      <td>${user.civicPoints.toLocaleString()}</td>
      <td><span class="status-pill ${user.status === 'Verified' ? 'pill-green' : 'pill-blue'}">${user.status}</span></td>
      <td><button class="action-btn remove" data-id="${user.id}">Remove</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.action-btn.remove').forEach(button => {
    button.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'), 10);
      removeUser(id);
    });
  });
}

function removeUser(id) {
  let users = getUsers();
  users = users.filter(user => user.id !== id);
  saveUsers(users);
  renderUsers();
}

function handleUsersPage() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return;
  }

  const userName = localStorage.getItem('adminUser');
  if (userName) {
    const userNameElement = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userNameElement) userNameElement.textContent = userName;
    if (userAvatar) userAvatar.textContent = userName.charAt(0).toUpperCase();
  }

  loadTheme();
  setupThemeToggle();
  initializeUsers();
  renderUsers();
}

function handleSettingsPage() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return;
  }

  const userName = localStorage.getItem('adminUser');
  if (userName) {
    const userNameElement = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userNameElement) userNameElement.textContent = userName;
    if (userAvatar) userAvatar.textContent = userName.charAt(0).toUpperCase();
  }

  loadTheme();
  setupThemeToggle();
}

function saveLoginDataLocally() {
  const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');

  if (loginAttempts.length === 0) {
    alert('No login data available to save.');
    return;
  }

  // Create a data object with metadata
  const dataToSave = {
    exportDate: new Date().toISOString(),
    totalAttempts: loginAttempts.length,
    loginAttempts: loginAttempts
  };

  // Generate filename
  const now = new Date();
  const filename = `admin_login_data_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;

  // Try to save using File System Access API
  saveJsonToProject(dataToSave, filename);
}

async function saveJsonToProject(data, filename) {
  try {
    if ('showSaveFilePicker' in window) {
      const options = {
        suggestedName: filename,
        types: [{
          description: 'JSON Files',
          accept: {
            'application/json': ['.json']
          }
        }]
      };
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      alert('Data saved successfully to your computer.');
    } else {
      // Fallback for browsers that don't support File System Access API
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Error saving file:', err);
    if (err.name !== 'AbortError') {
      alert('Failed to save data. Please try again.');
    }
  }
}

function exportLoginDataToExcel() {
  const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');

  if (loginAttempts.length === 0) {
    alert('No login data available to export.');
    return;
  }

  // Format data for Excel
  const worksheetData = loginAttempts.map(attempt => ({
    'Username': attempt.username,
    'Timestamp': attempt.timestamp,
    'IP Address': attempt.ipAddress,
    'User Agent': attempt.userAgent,
    'Status': attempt.success ? 'Success' : 'Failed'
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(worksheetData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Login Attempts');

  // Generate filename
  const now = new Date();
  const filename = `civicfix_admin_export_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`;

  // Save the file
  XLSX.writeFile(wb, filename);
}

function handleDashboardPage() {
  const userName = localStorage.getItem('adminUser');
  if (userName) {
    const userNameElement = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userNameElement) {
      userNameElement.textContent = userName;
    }
    if (userAvatar) {
      userAvatar.textContent = userName.charAt(0).toUpperCase();
    }
  }

  loadTheme();
  setupThemeToggle();
  initializeComplaints();
  renderComplaints();
  updateComplaintStats();
  setInterval(updateDashboardData, 30000);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to logout?')) {
        clearAuthentication();
        redirectToLogin();
      }
    });
  }

  const exportBtn = document.getElementById('export-login-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      exportLoginDataToExcel();
    });
  }

  const saveLocalBtn = document.getElementById('save-local-data');
  if (saveLocalBtn) {
    saveLocalBtn.addEventListener('click', function() {
      saveLoginDataLocally();
    });
  }
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  localStorage.setItem('dashboardTheme', theme);
}

function loadTheme() {
  const storedTheme = localStorage.getItem('dashboardTheme') || 'light';
  applyTheme(storedTheme);
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.checked = storedTheme === 'dark';
  }
}

function setupThemeToggle() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (!toggle) {
    return;
  }

  toggle.addEventListener('change', function() {
    applyTheme(this.checked ? 'dark' : 'light');
  });
}

function updateDashboardData() {
  setTimeout(() => {
    updateComplaintStats();
  }, 1000);
}

function handleLoginPage() {
  if (isAuthenticated()) {
    redirectToDashboard();
    return;
  }

  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  const rememberInput = document.getElementById('remember');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.querySelector('.login-btn');

  if (localStorage.getItem('rememberLogin') === 'true') {
    const rememberedUser = localStorage.getItem('adminUser');
    if (rememberedUser) {
      usernameInput.value = rememberedUser;
      rememberInput.checked = true;
    }
  }

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberInput.checked;

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    if (username && password && validateAdminCredentials(username, password)) {
      setAuthentication(username, remember);
      successMessage.style.display = 'block';
      setTimeout(redirectToDashboard, 1200);
      return;
    }

    // Store failed login attempt
    storeFailedLoginAttempt(username, password);

    setTimeout(() => {
      errorMessage.style.display = 'block';
      loginButton.disabled = false;
      loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }, 800);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('login-form')) {
    handleLoginPage();
  } else if (document.getElementById('settings-page')) {
    handleSettingsPage();
  } else if (document.getElementById('users-table-body')) {
    handleUsersPage();
  } else if (document.getElementById('logout-btn')) {
    handleDashboardPage();
  }
});