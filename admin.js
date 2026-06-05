// ============================================================
// admin.js – Admin Dashboard Logic
// ============================================================

// ---- Auth guard: redirect to login if not logged in ----
if (!sessionStorage.getItem('adminLoggedIn')) {
  window.location.href = 'login.html';
}

// ---- Logout ----
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'login.html';
});

// ---- Tab switching ----
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ---- Load data from localStorage ----
function getWorkers() {
  return JSON.parse(localStorage.getItem('church_workers') || '[]');
}
function getAllAttendance() {
  return JSON.parse(localStorage.getItem('church_attendance') || '[]');
}

// ---- Update metric cards from real data ----
function updateMetrics() {
  const workers    = getWorkers();
  const attendance = getAllAttendance();

  document.getElementById('total-workers').textContent = workers.length;

  const today       = new Date();
  const lastSunday  = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());
  const lastSundayISO = lastSunday.toISOString().split('T')[0];

  const thisSundayCount = attendance.filter(a => a.isoDate === lastSundayISO).length;
  document.getElementById('this-sunday').textContent = thisSundayCount;

  const sundays = [...new Set(attendance.map(a => a.isoDate))].sort().slice(-4);
  if (sundays.length > 0 && workers.length > 0) {
    const avgPresent = sundays.reduce((sum, d) => {
      return sum + attendance.filter(a => a.isoDate === d).length;
    }, 0) / sundays.length;
    document.getElementById('att-rate').textContent = Math.round((avgPresent / workers.length) * 100) + '%';
  } else {
    document.getElementById('att-rate').textContent = '—';
  }

  const activeDepts = new Set(workers.map(w => w.dept)).size;
  document.getElementById('dept-count').textContent = activeDepts || '—';
}

// ---- Department Bar Chart ----
function renderDeptChart() {
  const workers   = getWorkers();
  const container = document.getElementById('dept-chart');

  if (workers.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">No workers registered yet.</p>';
    return;
  }

  const counts = {};
  workers.forEach(w => { counts[w.dept] = (counts[w.dept] || 0) + 1; });
  const max = Math.max(...Object.values(counts));

  container.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, count]) => `
      <div class="dept-bar-row">
        <div class="dept-bar-label">${dept}</div>
        <div class="dept-bar-track">
          <div class="dept-bar-fill" style="width: ${Math.round(count / max * 100)}%">
            <span class="dept-bar-count">${count}</span>
          </div>
        </div>
      </div>
    `).join('');
}

// ---- Workers Table ----
function renderWorkers(list) {
  const tbody = document.getElementById('workers-body');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No workers registered yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(w => `
    <tr>
      <td style="font-weight:500;">${w.name}</td>
      <td style="color:var(--text-secondary);">${w.title}</td>
      <td><span class="badge ${DEPT_BADGE[w.dept] || 'badge-choir'}">${w.dept}</span></td>
      <td style="color:var(--text-secondary);">${w.phone}</td>
      <td style="color:var(--text-secondary);">${w.location}</td>
      <td style="color:var(--text-secondary);">${formatDate(w.joined)}</td>
    </tr>
  `).join('');
}

function filterWorkers() {
  const q    = document.getElementById('worker-search').value.toLowerCase();
  const dept = document.getElementById('dept-filter').value;
  renderWorkers(getWorkers().filter(w =>
    (!q    || w.name.toLowerCase().includes(q)) &&
    (!dept || w.dept === dept)
  ));
}

// ---- Attendance Table ----
function populateWeekFilter() {
  const all    = getAllAttendance();
  const select = document.getElementById('week-filter');
  const dates  = [...new Set(all.map(a => a.date))].sort((a, b) => new Date(b) - new Date(a));
  select.innerHTML = `<option value="">All weeks</option>` +
    dates.map(d => `<option value="${d}">${d}</option>`).join('');
}

function renderAttendance(list) {
  const tbody = document.getElementById('att-body');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:28px;">No attendance records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(a => `
    <tr>
      <td style="font-weight:500;">${a.name}</td>
      <td><span class="badge ${DEPT_BADGE[a.dept] || 'badge-choir'}">${a.dept}</span></td>
      <td style="color:var(--text-secondary);">${a.date}</td>
      <td style="color:var(--text-secondary);">${a.service}</td>
      <td><span class="badge badge-present">${a.status}</span></td>
    </tr>
  `).join('');
}

function filterAttendance() {
  const week = document.getElementById('week-filter').value;
  const dept = document.getElementById('att-dept-filter').value;
  renderAttendance(getAllAttendance().filter(a =>
    (!week || a.date === week) &&
    (!dept || a.dept === dept)
  ));
}

// ---- Helpers ----
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Init ----
updateMetrics();
renderDeptChart();
renderWorkers(getWorkers());
populateWeekFilter();
renderAttendance(getAllAttendance());