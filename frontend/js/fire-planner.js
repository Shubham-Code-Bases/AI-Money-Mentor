// ── FIRE Planner JS ──
let fireChart = null, sipAllocChart = null;

function recalcFIRE() {
  const currentAge = parseInt(document.getElementById('currentAge').value) || 30;
  const fireAge = parseInt(document.getElementById('fireAge').value) || 50;
  const currentSavings = parseFloat(document.getElementById('fireSavings').value) || 1800000;
  const monthlyExp = parseFloat(document.getElementById('monthlyExp').value) || 80000;
  const returnRate = parseFloat(document.getElementById('expectedReturn').value) / 100 || 0.12;
  const inflation = parseFloat(document.getElementById('inflationRate').value) / 100 || 0.06;

  const yearsToFIRE = Math.max(1, fireAge - currentAge);
  const realReturn = (1 + returnRate) / (1 + inflation) - 1;

  // FIRE corpus = 25x annual expenses (4% rule) — inflation-adjusted
  const inflatedMonthlyExp = monthlyExp * Math.pow(1 + inflation, yearsToFIRE);
  const leanCorpus = inflatedMonthlyExp * 12 * 20;   // 5% withdrawal rate
  const stdCorpus = inflatedMonthlyExp * 12 * 25;    // 4% withdrawal rate  
  const fatCorpus = inflatedMonthlyExp * 12 * 33;    // 3% withdrawal rate

  // SIP needed for standard FIRE
  const monthlyRate = returnRate / 12;
  const n = yearsToFIRE * 12;
  const futureValueOfCurrentSavings = currentSavings * Math.pow(1 + returnRate, yearsToFIRE);
  const remaining = Math.max(0, stdCorpus - futureValueOfCurrentSavings);
  const sipNeeded = remaining * monthlyRate / (Math.pow(1 + monthlyRate, n) - 1);

  // Update UI
  const fireYear = new Date().getFullYear() + yearsToFIRE;
  document.getElementById('yearsToFire').textContent = yearsToFIRE;
  document.getElementById('fireDate').textContent = `Target Year: ${fireYear}`;
  document.getElementById('requiredSIP').textContent = formatINR(Math.max(0, sipNeeded));
  document.getElementById('sipNote').textContent = `for ₹${(stdCorpus / 10000000).toFixed(2)}Cr corpus by age ${fireAge}`;

  // Stats row
  document.getElementById('fireStats').innerHTML = [
    { label: 'FIRE Corpus (4% Rule)', value: formatINR(stdCorpus), color: '#f97316' },
    { label: 'Current Corpus Growth', value: formatINR(futureValueOfCurrentSavings), color: '#6366f1' },
    { label: 'Additional Corpus Needed', value: formatINR(Math.max(0, remaining)), color: '#ef4444' },
    { label: 'Monthly SIP Required', value: formatINR(Math.max(0, sipNeeded)), color: '#10b981' },
  ].map(s => `
    <div class="fire-stat">
      <div class="lbl">${s.label}</div>
      <div class="val" style="color:${s.color}">${s.value}</div>
    </div>
  `).join('');

  // Scenario cards
  document.getElementById('scenarioCards').innerHTML = [
    { cls: 'lean', emoji: '🌿', name: 'Lean FIRE', corpus: leanCorpus, exp: monthlyExp * 0.7, desc: 'Minimal lifestyle — no luxury. Works in low-cost cities. Tight budget, maximum freedom.', color: '#3b82f6' },
    { cls: 'barista', emoji: '☕', name: 'Barista FIRE', corpus: stdCorpus * 0.7, exp: monthlyExp, desc: 'Semi-retire: part-time work covers basics. Portfolio for leisure & healthcare. Popular choice.', color: '#10b981' },
    { cls: 'fat', emoji: '🌟', name: 'Fat FIRE', corpus: fatCorpus, exp: monthlyExp * 1.5, desc: 'Retire in abundance. Travel, dining, healthcare all covered by portfolio. Highest corpus needed.', color: '#f97316' },
  ].map(s => {
    const sipForThis = calcSIP(s.corpus, currentSavings, returnRate, yearsToFIRE);
    return `
      <div class="scenario-card ${s.cls}" onclick="selectScenario(${s.corpus}, ${sipForThis})">
        <div style="font-size:24px;margin-bottom:8px">${s.emoji}</div>
        <div class="sc-name" style="color:${s.color}">${s.name}</div>
        <div class="sc-corpus" style="color:${s.color}">${formatINR(s.corpus)}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">SIP: ${formatINR(sipForThis)}/month</div>
        <div class="sc-desc">${s.desc}</div>
      </div>
    `;
  }).join('');

  // Growth chart
  drawFireGrowth(currentSavings, sipNeeded, returnRate, yearsToFIRE, stdCorpus);
  drawSIPAlloc(sipNeeded);
}

function calcSIP(corpus, currentSavings, returnRate, years) {
  const fvCurrent = currentSavings * Math.pow(1 + returnRate, years);
  const remaining = Math.max(0, corpus - fvCurrent);
  const mr = returnRate / 12;
  const n = years * 12;
  if (remaining <= 0) return 0;
  return remaining * mr / (Math.pow(1 + mr, n) - 1);
}

function selectScenario(corpus, sip) {
  document.getElementById('requiredSIP').textContent = formatINR(Math.max(0, sip));
  document.getElementById('sipNote').textContent = `for ${formatINR(corpus)} corpus`;
}

function drawFireGrowth(savings, sip, rate, years, targetCorpus) {
  const labels = [], portfolio = [], target = [];
  let corpus = savings;
  const monthlyRate = rate / 12;

  for (let y = 0; y <= years; y++) {
    labels.push(`Age ${30 + y}`);
    portfolio.push(Math.round(corpus / 100000) / 10); // in Lakhs
    target.push(Math.round(targetCorpus / 100000) / 10);
    // Grow by year
    for (let m = 0; m < 12; m++) { corpus = corpus * (1 + monthlyRate) + sip; }
  }

  const ctx = document.getElementById('fireGrowthChart').getContext('2d');
  if (fireChart) fireChart.destroy();
  fireChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Portfolio Value', data: portfolio, borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.4 },
        { label: 'FIRE Target', data: target, borderColor: '#94a3b8', borderDash: [6, 3], fill: false, tension: 0 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#94a3b8' } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ₹' + c.raw + 'L' } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => '₹' + v + 'L' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 8 } }
      }
    }
  });
}

function drawSIPAlloc(sipNeeded) {
  const equity = sipNeeded * 0.7;
  const debt = sipNeeded * 0.2;
  const gold = sipNeeded * 0.1;
  const ctx = document.getElementById('sipAllocationChart').getContext('2d');
  if (sipAllocChart) sipAllocChart.destroy();
  sipAllocChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Equity MF', 'Debt / Bonds', 'Gold ETF'],
      datasets: [{ data: [equity, debt, gold], backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b'], borderWidth: 2, borderColor: '#070b14' }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, boxWidth: 10 } }, tooltip: { callbacks: { label: c => c.label + ': ' + formatINR(c.raw) + '/mo' } } }
    }
  });
}

function formatINR(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + Math.round(n / 1000) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
