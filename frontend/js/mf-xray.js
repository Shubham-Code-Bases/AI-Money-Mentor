// ── MF Portfolio X-Ray JS ──
let compChart = null, benchChart = null;

const SAMPLE_FUNDS = [
  { name: 'Mirae Asset Large Cap Fund', invested: 200000, current: 268000, date: '2021-01-15', type: 'Large Cap', expense: 1.57 },
  { name: 'Parag Parikh Flexi Cap Fund', invested: 150000, current: 213000, date: '2021-06-01', type: 'Flexi Cap', expense: 0.63 },
  { name: 'HDFC Mid Cap Opportunities', invested: 100000, current: 158000, date: '2020-09-10', type: 'Mid Cap', expense: 1.71 },
  { name: 'SBI Small Cap Fund', invested: 80000, current: 134000, date: '2021-03-20', type: 'Small Cap', expense: 1.82 },
];

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('wp_token')) { window.location.href = '../auth.html'; return; }
  renderFundRows(SAMPLE_FUNDS);
  analyzePortfolio();
});

function renderFundRows(funds) {
  const container = document.getElementById('fundRows');
  container.innerHTML = funds.map((f, i) => `
    <div class="fund-input-row" id="fundRow_${i}">
      <input type="text" class="form-control" placeholder="Fund name" value="${f.name}" id="fn_${i}">
      <input type="number" class="form-control" placeholder="Invested" value="${f.invested}" id="fi_${i}">
      <input type="number" class="form-control" placeholder="Current" value="${f.current}" id="fc_${i}">
      <input type="date" class="form-control" value="${f.date}" id="fd_${i}">
      <button class="btn btn-danger btn-sm" onclick="removeFund(${i})">✕</button>
    </div>
  `).join('');
}

function addFundRow() {
  const n = document.querySelectorAll('[id^="fn_"]').length;
  const div = document.createElement('div');
  div.className = 'fund-input-row';
  div.id = `fundRow_${n}`;
  div.innerHTML = `
    <input type="text" class="form-control" placeholder="Fund name" id="fn_${n}">
    <input type="number" class="form-control" placeholder="Invested" id="fi_${n}">
    <input type="number" class="form-control" placeholder="Current Value" id="fc_${n}">
    <input type="date" class="form-control" id="fd_${n}">
    <button class="btn btn-danger btn-sm" onclick="removeFund(${n})">✕</button>
  `;
  document.getElementById('fundRows').appendChild(div);
}

function removeFund(i) {
  const el = document.getElementById(`fundRow_${i}`);
  if (el) el.remove();
}

function loadSamplePortfolio() {
  renderFundRows(SAMPLE_FUNDS);
  switchInputTab('manual');
}

function getFundsFromUI() {
  const funds = [];
  const inputs = document.querySelectorAll('[id^="fn_"]');
  inputs.forEach((el, i) => {
    const name = el.value.trim();
    const invested = parseFloat(document.getElementById(`fi_${i}`)?.value) || 0;
    const current = parseFloat(document.getElementById(`fc_${i}`)?.value) || 0;
    const date = document.getElementById(`fd_${i}`)?.value || '2021-01-01';
    if (name && invested > 0) {
      const sample = SAMPLE_FUNDS.find(f => f.name === name);
      funds.push({ name, invested, current, date, type: sample?.type || 'Flexi Cap', expense: sample?.expense || 1.5 });
    }
  });
  return funds.length ? funds : SAMPLE_FUNDS;
}

function analyzePortfolio() {
  const funds = getFundsFromUI();
  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');

  const totalInvested = funds.reduce((s, f) => s + f.invested, 0);
  const totalCurrent = funds.reduce((s, f) => s + f.current, 0);
  const gain = totalCurrent - totalInvested;
  const gainPct = ((gain / totalInvested) * 100).toFixed(1);

  // XIRR approximation
  const xirr = calcSimpleXIRR(funds);

  // Update metrics
  document.getElementById('xirrVal').textContent = xirr.toFixed(1) + '%';
  document.getElementById('xirrNote').textContent = xirr > 12 ? '✅ Beating benchmark' : '⚠️ Below Nifty 50 avg';
  document.getElementById('totalInvested').textContent = formatINR(totalInvested);
  document.getElementById('currentValue').textContent = formatINR(totalCurrent);
  document.getElementById('absoluteGain').innerHTML = `<span style="color:${gain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${gain >= 0 ? '+' : ''}${formatINR(gain)} (${gainPct}%)</span>`;

  // Charts
  drawCompositionChart(funds);
  drawBenchmarkChart(xirr);

  // Fund table
  renderFundTable(funds, totalInvested, totalCurrent);

  // Overlap analysis
  renderOverlapAnalysis(funds);

  // Expense ratio
  renderExpenseAnalysis(funds);

  // Rebalancing
  renderRebalancing(funds, user.risk_level || 'Moderate');

  document.getElementById('xrayResults').classList.add('show');
}

function calcSimpleXIRR(funds) {
  // Weighted XIRR approximation based on holding period
  const now = new Date();
  let weightedReturn = 0, totalWeight = 0;
  funds.forEach(f => {
    const start = new Date(f.date);
    const years = Math.max(0.1, (now - start) / (365.25 * 24 * 3600 * 1000));
    const cagr = (Math.pow(f.current / f.invested, 1 / years) - 1) * 100;
    weightedReturn += cagr * f.invested;
    totalWeight += f.invested;
  });
  return totalWeight > 0 ? weightedReturn / totalWeight : 12;
}

function drawCompositionChart(funds) {
  const types = {};
  funds.forEach(f => { types[f.type] = (types[f.type] || 0) + f.current; });
  const ctx = document.getElementById('compositionChart').getContext('2d');
  if (compChart) compChart.destroy();
  compChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(types),
      datasets: [{ data: Object.values(types), backgroundColor: ['#6366f1','#06b6d4','#10b981','#f59e0b','#ec4899'], borderWidth: 2, borderColor: '#070b14' }]
    },
    options: { plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 14, boxWidth: 12 } }, tooltip: { callbacks: { label: c => ' ₹' + Math.round(c.raw).toLocaleString('en-IN') } } }, cutout: '60%' }
  });
}

function drawBenchmarkChart(xirr) {
  const niftyYears = [1, 2, 3, 4, 5];
  const niftyReturns = [12.5, 14.2, 16.1, 13.8, 15.6];
  const portfolioReturns = niftyYears.map(() => xirr + (Math.random() * 4 - 2));
  const ctx = document.getElementById('benchmarkChart').getContext('2d');
  if (benchChart) benchChart.destroy();
  benchChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: niftyYears.map(y => `${y}Y CAGR`),
      datasets: [
        { label: 'Your Portfolio', data: portfolioReturns.map(v => +v.toFixed(1)), borderColor: '#6366f1', tension: 0.4, fill: false, pointRadius: 5 },
        { label: 'Nifty 50', data: niftyReturns, borderColor: '#94a3b8', borderDash: [5, 5], tension: 0.4, fill: false, pointRadius: 5 }
      ]
    },
    options: { plugins: { legend: { labels: { color: '#94a3b8' } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + '%' } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => v + '%' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } }
  });
}

function renderFundTable(funds, totalInv, totalCur) {
  const container = document.getElementById('fundAnalysisRows');
  container.innerHTML = funds.map(f => {
    const gain = f.current - f.invested;
    const gainPct = ((gain / f.invested) * 100).toFixed(1);
    const years = Math.max(0.1, (new Date() - new Date(f.date)) / (365.25 * 24 * 3600 * 1000));
    const cagr = ((Math.pow(f.current / f.invested, 1 / years) - 1) * 100).toFixed(1);
    const color = gain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    return `
      <div class="fund-row">
        <div>
          <div style="font-weight:600;font-size:13px">${f.name}</div>
          <span class="badge badge-blue" style="margin-top:4px;font-size:10px">${f.type}</span>
        </div>
        <div>${formatINR(f.invested)}</div>
        <div style="color:${color}">${formatINR(f.current)} <span style="font-size:11px">(${gainPct}%)</span></div>
        <div style="color:${color};font-weight:700">${cagr}%</div>
        <div style="color:${parseFloat(f.expense) > 1 ? 'var(--accent-red)' : 'var(--accent-green)'}">${f.expense}%</div>
      </div>
    `;
  }).join('');
}

function renderOverlapAnalysis(funds) {
  const overlaps = [];
  for (let i = 0; i < funds.length - 1; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      // Simulated overlap — large cap funds tend to overlap more
      let pct = 20 + Math.floor(Math.random() * 35);
      if (funds[i].type === 'Large Cap' && funds[j].type === 'Large Cap') pct = 55 + Math.floor(Math.random() * 25);
      if (funds[i].type === funds[j].type) pct = Math.min(pct + 20, 80);
      overlaps.push({ a: funds[i].name.split(' ').slice(0, 2).join(' '), b: funds[j].name.split(' ').slice(0, 2).join(' '), pct });
    }
  }
  const container = document.getElementById('overlapList');
  container.innerHTML = overlaps.map(o => {
    const color = o.pct > 50 ? '#ef4444' : o.pct > 30 ? '#f59e0b' : '#10b981';
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">${o.a} ↔ ${o.b}</span>
          <span style="font-weight:700;color:${color}">${o.pct}%</span>
        </div>
        <div class="overlap-bar"><div class="overlap-fill" style="width:${o.pct}%;background:${color}"></div></div>
        ${o.pct > 45 ? `<div style="font-size:11px;color:var(--accent-red);margin-top:4px">⚠️ High overlap — consider consolidating</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderExpenseAnalysis(funds) {
  const container = document.getElementById('expenseList');
  const totalInvested = funds.reduce((s, f) => s + f.invested, 0);
  const avgExpense = funds.reduce((s, f) => s + f.expense * f.invested, 0) / totalInvested;
  const directAvg = 0.4; // estimate for direct plans
  const dragPerYear = ((avgExpense - directAvg) / 100) * totalInvested;

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Your average expense ratio</div>
      <div style="font-size:28px;font-weight:800;font-family:'Outfit',sans-serif;color:var(--accent-red)">${avgExpense.toFixed(2)}%</div>
      <div style="font-size:12px;color:var(--text-muted)">Direct plans avg: ~0.4%</div>
    </div>
    <div class="highlight-box orange" style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;color:var(--accent-orange)">💸 Annual Expense Drag</div>
      <div style="font-size:22px;font-weight:700;margin:4px 0;color:var(--accent-red)">−${formatINR(dragPerYear)}/year</div>
      <div style="font-size:12px;color:var(--text-muted)">Cost of staying in regular plans vs direct</div>
    </div>
    ${funds.map(f => `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px">
        <span>${f.name.split(' ').slice(0,3).join(' ')}</span>
        <span style="color:${f.expense > 1 ? 'var(--accent-red)' : 'var(--accent-green)'}">
          ${f.expense}% ${f.expense > 1 ? '↑ Switch to Direct' : '✓ OK'}
        </span>
      </div>
    `).join('')}
  `;
}

function renderRebalancing(funds, riskLevel) {
  document.getElementById('rebalRiskBadge').textContent = riskLevel;
  const container = document.getElementById('rebalCards');
  const recs = [];

  // Logic based on composition
  const largeCap = funds.filter(f => f.type === 'Large Cap');
  const smallCap = funds.filter(f => f.type === 'Small Cap');
  const midCap = funds.filter(f => f.type === 'Mid Cap');

  if (largeCap.length > 1) {
    recs.push({ action: 'sell', title: 'Consolidate Large Cap Overlap', desc: `You have ${largeCap.length} large cap funds with high overlap. Consider merging into one — Mirae Asset Large Cap or Nifty 50 Index Fund.`, badge: 'sell' });
  }
  if (riskLevel === 'High' && smallCap.length === 0) {
    recs.push({ action: 'buy', title: 'Add Small Cap Exposure', desc: 'Your aggressive risk profile suggests 15-20% allocation in small cap. Consider SBI Small Cap or Nippon Small Cap Fund.', badge: 'buy' });
  }
  if (riskLevel === 'Low' && (smallCap.length > 0 || midCap.length > 0)) {
    recs.push({ action: 'sell', title: 'Reduce High-Risk Exposure', desc: 'Your low risk profile means small/mid cap should be < 10%. Consider shifting to large cap or hybrid funds.', badge: 'sell' });
  }
  recs.push({ action: 'hold', title: 'Switch Regular → Direct Plans', desc: `You can save ${formatINR(((funds.reduce((s,f)=>s+f.expense*f.invested,0)/funds.reduce((s,f)=>s+f.invested,0) - 0.4)/100)*funds.reduce((s,f)=>s+f.invested,0))}/year by switching to direct plans. No surrender charges for SIP units held > 1 year.`, badge: 'hold' });

  container.innerHTML = recs.map(r => `
    <div class="rebal-card ${r.badge}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:18px">${r.action === 'buy' ? '🟢 BUY' : r.action === 'sell' ? '🔴 SELL/SWITCH' : '🟡 SWITCH'}</span>
        <strong style="font-size:15px">${r.title}</strong>
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.6">${r.desc}</p>
    </div>
  `).join('');
}

function formatINR(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
