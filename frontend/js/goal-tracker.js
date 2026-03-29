// ── Goal Tracker JS ──
let goalChart = null;
const GOAL_KEY = 'wp_goals';

const DEFAULT_GOALS = [
  { id:1, icon:'🏠', name:'Dream Home', target:7500000, current:800000, monthly:25000, year:2030, returnRate:12 },
  { id:2, icon:'🎓', name:"Child's Education", target:3000000, current:200000, monthly:12000, year:2035, returnRate:10 },
  { id:3, icon:'🏖️', name:'Retirement Fund', target:50000000, current:1800000, monthly:30000, year:2050, returnRate:12 },
  { id:4, icon:'✈️', name:'World Tour', target:800000, current:100000, monthly:15000, year:2027, returnRate:8 },
];

function initGoals() {
  let goals = loadGoals();
  if (!goals || goals.length === 0) {
    const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
    const userGoalNames = user.goals || [];
    goals = DEFAULT_GOALS.filter(g =>
      userGoalNames.length === 0 || userGoalNames.some(n => g.name.toLowerCase().includes(n.toLowerCase().split(' ')[0]))
    );
    if (goals.length === 0) goals = DEFAULT_GOALS.slice(0, 2);
    saveGoals(goals);
  }
  renderAll(goals);
}

function loadGoals() { try { return JSON.parse(localStorage.getItem(GOAL_KEY) || 'null'); } catch { return null; } }
function saveGoals(g) { localStorage.setItem(GOAL_KEY, JSON.stringify(g)); }

function addGoal() {
  const name = document.getElementById('gName').value.trim();
  const target = parseFloat(document.getElementById('gTarget').value);
  const current = parseFloat(document.getElementById('gCurrent').value) || 0;
  const monthly = parseFloat(document.getElementById('gMonthly').value);
  const year = parseInt(document.getElementById('gYear').value);
  const returnRate = parseFloat(document.getElementById('gReturn').value) || 12;
  const icon = document.getElementById('gIcon').value;

  if (!name || !target || !year) { alert('Please fill all required fields'); return; }
  const goals = loadGoals() || [];
  goals.push({ id: Date.now(), icon, name, target, current, monthly, year, returnRate });
  saveGoals(goals);
  renderAll(goals);
  document.getElementById('addGoalForm').classList.remove('show');
  // Reset form
  ['gName','gTarget','gCurrent','gMonthly','gYear'].forEach(id => document.getElementById(id).value = '');
}

function deleteGoal(id) {
  if (!confirm('Remove this goal?')) return;
  const goals = (loadGoals() || []).filter(g => g.id !== id);
  saveGoals(goals);
  renderAll(goals);
}

function renderAll(goals) {
  renderStats(goals);
  renderGoalCards(goals);
  renderProgressChart(goals);
}

function renderStats(goals) {
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.current, 0);
  const totalSIP = goals.reduce((s, g) => s + g.monthly, 0);
  const onTrack = goals.filter(g => projectedValue(g) >= g.target).length;

  document.getElementById('goalStats').innerHTML = [
    { label: 'Total Goals', value: goals.length, sub: `${onTrack} on track`, color: '#6366f1' },
    { label: 'Total Target', value: formatINR(totalTarget), sub: 'Across all goals', color: '#f59e0b' },
    { label: 'Total Invested', value: formatINR(totalCurrent), sub: `${Math.round(totalCurrent/totalTarget*100)}% achieved`, color: '#10b981' },
    { label: 'Total Monthly SIP', value: formatINR(totalSIP), sub: 'Combined SIP commitment', color: '#3b82f6' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="color:${s.color}">${s.value}</div>
      <div class="stat-change">${s.sub}</div>
    </div>
  `).join('');
}

function projectedValue(goal) {
  const now = new Date().getFullYear();
  const years = Math.max(0, goal.year - now);
  const rate = goal.returnRate / 100;
  const monthlyRate = rate / 12;
  const n = years * 12;
  const fvCurrent = goal.current * Math.pow(1 + rate, years);
  const fvSIP = goal.monthly * (Math.pow(1 + monthlyRate, n) - 1) / monthlyRate;
  return fvCurrent + fvSIP;
}

function renderGoalCards(goals) {
  document.getElementById('goalsGrid').innerHTML = goals.map(g => {
    const projected = projectedValue(g);
    const pct = Math.min(100, Math.round(g.current / g.target * 100));
    const onTrack = projected >= g.target;
    const shortfall = g.target - projected;
    const years = Math.max(0, g.year - new Date().getFullYear());
    const colors = ['#6366f1','#10b981','#f59e0b','#06b6d4','#ec4899','#ef4444'];
    const colorIdx = goals.indexOf(g) % colors.length;
    const color = colors[colorIdx];

    return `
      <div class="goal-card">
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
          <div class="goal-icon-badge" style="background:${color}20">${g.icon}</div>
          <div style="flex:1">
            <div class="goal-name">${g.name}</div>
            <div class="goal-target">Target: ${formatINR(g.target)} by ${g.year}</div>
          </div>
          <span class="badge ${onTrack ? 'badge-green' : 'badge-red'}">${onTrack ? '✓ On Track' : '⚠️ At Risk'}</span>
        </div>
        <div class="goal-amount-row">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">SAVED SO FAR</div>
            <div class="goal-saved" style="color:${color}">${formatINR(g.current)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">REMAINING</div>
            <div style="font-size:18px;font-weight:700;font-family:'Outfit',sans-serif">${formatINR(g.target - g.current)}</div>
          </div>
        </div>
        <div class="progress-bar" style="margin-bottom:6px"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:12px">
          <span>${pct}% achieved</span><span>SIP: ${formatINR(g.monthly)}/mo</span>
        </div>
        <div class="goal-timeline" style="background:${onTrack ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};border:1px solid ${onTrack ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}">
          ${onTrack
            ? `<span style="color:var(--accent-green)">✅ Projected: ${formatINR(projected)} — You'll exceed target by ${formatINR(projected - g.target)}</span>`
            : `<span style="color:var(--accent-red)">❗ Shortfall: ${formatINR(shortfall)} — Increase SIP by ${formatINR(shortfall / (years * 12 || 1))}/mo</span>`
          }
        </div>
        <div style="margin-top:12px;display:flex;justify-content:flex-end">
          <button class="btn btn-danger btn-sm" onclick="deleteGoal(${g.id})">Remove</button>
        </div>
      </div>
    `;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No goals yet. Click "+ Add Goal" to start!</div>';
}

function renderProgressChart(goals) {
  const ctx = document.getElementById('goalProgressChart').getContext('2d');
  if (goalChart) goalChart.destroy();
  goalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: goals.map(g => g.name),
      datasets: [
        { label: 'Saved', data: goals.map(g => g.current), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
        { label: 'Projected', data: goals.map(g => Math.round(projectedValue(g))), backgroundColor: 'rgba(16,185,129,0.4)', borderRadius: 6 },
        { label: 'Target', data: goals.map(g => g.target), type: 'line', borderColor: '#f59e0b', borderDash: [6, 3], fill: false, pointRadius: 4 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#94a3b8' } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatINR(c.raw) } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => formatINR(v) } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function formatINR(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + Math.round(n / 1000) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
