// ── Health Score JS ──
let radarChart = null;

const PILLARS = [
  { key: 'emergency', icon: '🏦', name: 'Emergency Fund', maxScore: 20, tip: 'Keep 6 months of expenses in liquid assets (FD, liquid MF).' },
  { key: 'insurance', icon: '🛡️', name: 'Insurance Coverage', maxScore: 15, tip: 'Life cover = 10-15x annual income. Health cover ≥ ₹5L for a family.' },
  { key: 'debt', icon: '💳', name: 'Debt Management', maxScore: 15, tip: 'EMI should be < 40% of monthly take-home income.' },
  { key: 'investing', icon: '📈', name: 'Investment Rate', maxScore: 20, tip: 'Save & invest at least 20-30% of your gross income.' },
  { key: 'tax', icon: '🧮', name: 'Tax Efficiency', maxScore: 15, tip: 'Maximize 80C, 80D, NPS deductions. Choose the optimal tax regime.' },
  { key: 'goals', icon: '🎯', name: 'Goal Progress', maxScore: 15, tip: 'Track every financial goal with a SIP and a target date.' },
];

function renderHealthScore() {
  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
  const income = user.income || 2400000;
  const savings = user.savings || 1800000;
  const goals = user.goals || [];
  const monthlyExpense = (income / 12) * 0.6;

  // Score each pillar
  const scores = {
    emergency: Math.min(20, Math.round((savings / (monthlyExpense * 6)) * 20)),
    insurance: 8, // placeholder — will be 15 if insurance module filled
    debt: 12,     // assume moderate debt
    investing: Math.min(20, Math.round((savings / income) * 60)),
    tax: 10,      // partial — improved via tax wizard
    goals: Math.min(15, goals.length * 5),
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  // Update big score
  const el = document.getElementById('bigScore');
  animateNumber(el, 0, totalScore, 1200);
  const color = totalScore >= 75 ? '#10b981' : totalScore >= 55 ? '#f59e0b' : '#ef4444';
  el.style.color = color;

  const grade = totalScore >= 85 ? '🌟 Excellent' : totalScore >= 70 ? '✅ Good' : totalScore >= 55 ? '⚠️ Fair' : '❗ Needs Attention';
  document.getElementById('scoreGrade').textContent = grade;
  document.getElementById('scoreMsg').textContent = totalScore >= 70
    ? 'Your finances are well-managed. Keep up the momentum!'
    : 'There are key areas to improve. Follow the action plan below.';

  // Radar chart
  drawRadar(scores);

  // Pillar cards
  renderPillarCards(scores, income, savings);

  // Action plan
  renderActionPlan(scores, income, savings, goals);
}

function drawRadar(scores) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  if (radarChart) radarChart.destroy();

  const maxes = { emergency: 20, insurance: 15, debt: 15, investing: 20, tax: 15, goals: 15 };
  const pcts = PILLARS.map(p => Math.round((scores[p.key] / maxes[p.key]) * 100));

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: PILLARS.map(p => p.name),
      datasets: [{
        label: 'Your Score',
        data: pcts,
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderColor: '#10b981',
        pointBackgroundColor: '#10b981',
        pointRadius: 5
      }]
    },
    options: {
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#94a3b8', backdropColor: 'transparent', stepSize: 25 },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#cbd5e1', font: { size: 12, weight: '500' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderPillarCards(scores, income, savings) {
  const maxes = { emergency: 20, insurance: 15, debt: 15, investing: 20, tax: 15, goals: 15 };
  const container = document.getElementById('pillarGrid');
  container.innerHTML = PILLARS.map(p => {
    const score = scores[p.key];
    const max = maxes[p.key];
    const pct = Math.round((score / max) * 100);
    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div class="pillar-card">
        <div class="pillar-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">${p.icon}</span>
            <span class="pillar-name">${p.name}</span>
          </div>
          <span class="pillar-score" style="color:${color}">${pct}%</span>
        </div>
        <div class="pillar-bar"><div class="pillar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="pillar-tip">${p.tip}</div>
      </div>
    `;
  }).join('');
}

function renderActionPlan(scores, income, savings, goals) {
  const actions = [];

  if (scores.emergency < 15) {
    const target = (income / 12 * 0.6) * 6;
    actions.push({ icon: '🏦', title: 'Build Emergency Fund', desc: `You need ₹${formatINR(target)} for 6-month emergency cover. Start a ₹${formatINR((target - savings) / 12)}/month liquid MF SIP.`, color: '#ef4444', priority: 'High' });
  }
  if (scores.insurance < 10) {
    actions.push({ icon: '🛡️', title: 'Get Adequate Insurance', desc: `Your life cover should be ₹${formatINR(income * 12)}. Buy a pure term plan — they're affordable at ₹8K–15K/year.`, color: '#f59e0b', priority: 'High' });
  }
  if (scores.tax < 12) {
    actions.push({ icon: '🧮', title: 'Maximize Tax Deductions', desc: 'You may be missing NPS (₹50K) and 80D (₹25K) deductions. Use the Tax Wizard to identify all missing deductions.', color: '#f59e0b', priority: 'Medium' });
  }
  if (scores.goals < 10) {
    actions.push({ icon: '🎯', title: 'Set Financial Goals', desc: `You've set ${goals.length} goals. Try adding at least 3 specific goals with amounts and dates in the Goal Tracker.`, color: '#6366f1', priority: 'Medium' });
  }
  if (scores.investing < 14) {
    const needed = Math.round(income * 0.25 / 12);
    actions.push({ icon: '📈', title: 'Increase SIP Contribution', desc: `Invest at least 25% of income (₹${formatINR(needed)}/month) through diversified MF SIPs. Increase by 10% each year.`, color: '#10b981', priority: 'Medium' });
  }
  actions.push({ icon: '🔥', title: 'Define Your FIRE Date', desc: 'Use the FIRE Planner to calculate the exact corpus needed for early retirement. It cross-links your goals automatically.', color: '#f97316', priority: 'Low' });

  const container = document.getElementById('actionSteps');
  container.innerHTML = actions.map((a, i) => `
    <div class="action-step">
      <div class="step-num" style="background:${a.color}20;color:${a.color}">${i + 1}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:16px">${a.icon}</span>
          <strong style="font-size:14px">${a.title}</strong>
          <span class="badge ${a.priority === 'High' ? 'badge-red' : a.priority === 'Medium' ? 'badge-yellow' : 'badge-blue'}">${a.priority}</span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);line-height:1.6">${a.desc}</p>
      </div>
    </div>
  `).join('');
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function step(ts) {
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * easeOut(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function formatINR(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
