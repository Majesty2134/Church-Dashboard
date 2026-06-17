// dashboard.js
import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdY6V4D_xXhI1tpSSLNv93cFWpMddQ94U",
  authDomain: "on-eagles-wings-1c8f5.firebaseapp.com",
  projectId: "on-eagles-wings-1c8f5",
  storageBucket: "on-eagles-wings-1c8f5.firebasestorage.app",
  messagingSenderId: "858585282489",
  appId: "1:858585282489:web:b7849b092456f445956868"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Auth guard
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'index.html';
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth).then(() => window.location.href = 'index.html');
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

// ---- Badge colours ----
const DEPT_BADGE = {
  'Choir': 'badge-choir',
  'Ushering': 'badge-ushering',
  'Media & Sound': 'badge-media',
  'Children\'s Ministry': 'badge-children',
  'Protocol': 'badge-protocol',
  'Prayer Team': 'badge-prayer',
  'Men\'s Fellowship': 'badge-men',
  'Women\'s Fellowship': 'badge-women',
  'Youth': 'badge-youth',
  'Ministers': 'badge-ministers'
};

// ---- Live data stores ----
let allWorkers = [];
let allAttendance = [];

// ---- Helpers ----
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Metrics ----
function updateMetrics() {
  document.getElementById('total-workers').textContent = allWorkers.length;

  const today = new Date();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());
  const lastSundayISO = lastSunday.toISOString().split('T')[0];

  const thisSundayCount = allAttendance.filter(a => a.date === lastSundayISO).length;
  document.getElementById('this-sunday').textContent = thisSundayCount;

  const sundays = [...new Set(allAttendance.map(a => a.date))].sort().slice(-4);
  if (sundays.length > 0 && allWorkers.length > 0) {
    const avgPresent = sundays.reduce((sum, d) => {
      return sum + allAttendance.filter(a => a.date === d).length;
    }, 0) / sundays.length;
    document.getElementById('att-rate').textContent = Math.round((avgPresent / allWorkers.length) * 100) + '%';
  } else {
    document.getElementById('att-rate').textContent = '—';
  }

  const activeDepts = new Set(allWorkers.map(w => w.department)).size;
  document.getElementById('dept-count').textContent = activeDepts || '—';
}

// ---- Department chart ----
function renderDeptChart() {
  const container = document.getElementById('dept-chart');
  if (allWorkers.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">No workers registered yet.</p>';
    return;
  }
  const counts = {};
  allWorkers.forEach(w => { counts[w.department] = (counts[w.department] || 0) + 1; });
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

// ---- Workers table ----
function renderWorkers(list) {
  const tbody = document.getElementById('workers-body');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No workers registered yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(w => `
    <tr>
      <td style="font-weight:500;">${w.firstName} ${w.lastName}</td>
      <td style="color:var(--text-secondary);">${w.title || '—'}</td>
      <td><span class="badge ${DEPT_BADGE[w.department] || 'badge-choir'}">${w.department}</span></td>
      <td style="color:var(--text-secondary);">${w.phone}</td>
      <td style="color:var(--text-secondary);">${w.city || '—'}, ${w.state || '—'}</td>
      <td style="color:var(--text-secondary);">${formatDate(w.dateJoined)}</td>
    </tr>
  `).join('');
}

function filterWorkers() {
  const q = document.getElementById('worker-search').value.toLowerCase();
  const dept = document.getElementById('dept-filter').value;
  renderWorkers(allWorkers.filter(w =>
    (!q || `${w.firstName} ${w.lastName}`.toLowerCase().includes(q)) &&
    (!dept || w.department === dept)
  ));
}

// ---- Attendance table ----
function populateWeekFilter() {
  const select = document.getElementById('week-filter');
  const dates = [...new Set(allAttendance.map(a => a.date))].sort((a, b) => new Date(b) - new Date(a));
  select.innerHTML = `<option value="">All weeks</option>` +
    dates.map(d => `<option value="${d}">${formatDate(d)}</option>`).join('');
}

function renderAttendance(list) {
  const tbody = document.getElementById('att-body');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px;">No attendance records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(a => `
    <tr>
      <td style="font-weight:500;">${a.fullName}</td>
      <td><span class="badge ${DEPT_BADGE[a.departments?.[0]] || 'badge-choir'}">${a.departments?.join(', ') || '—'}</span></td>
      <td style="color:var(--text-secondary);">${formatDate(a.date)}</td>
      <td style="color:var(--text-secondary);">${Array.isArray(a.service) ? a.service.join(', ') : a.service}</td>
      <td><span class="badge badge-present">Present</span></td>
      <td style="color:var(--text-secondary);">${a.arrivalTime || '—'}</td>
    </tr>
  `).join('');
}

function filterAttendance() {
  const week = document.getElementById('week-filter').value;
  const dept = document.getElementById('att-dept-filter').value;
  renderAttendance(allAttendance.filter(a =>
    (!week || a.date === week) &&
    (!dept || a.departments?.includes(dept))
  ));
}

// ---- Filter listeners ----
document.getElementById('worker-search').addEventListener('input', filterWorkers);
document.getElementById('dept-filter').addEventListener('change', filterWorkers);
document.getElementById('week-filter').addEventListener('change', filterAttendance);
document.getElementById('att-dept-filter').addEventListener('change', filterAttendance);

// ---- Live Firestore listeners ----
onSnapshot(query(collection(db, "members"), orderBy("registeredAt", "desc")), (snapshot) => {
  allWorkers = snapshot.docs.map(doc => doc.data());
  updateMetrics();
  renderDeptChart();
  renderWorkers(allWorkers);
});

onSnapshot(query(collection(db, "attendance"), orderBy("markedAt", "desc")), (snapshot) => {
  allAttendance = snapshot.docs.map(doc => doc.data());
  updateMetrics();
  populateWeekFilter();
  renderAttendance(allAttendance);
});