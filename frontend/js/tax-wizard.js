// ── Tax Wizard JS ──
// Complete old vs new regime calculator + AI investment ranking

let taxCompareChart = null;
let taxBreakdownChart = null;

function updatePreview() { /* live preview stub */ }

function loadSampleData() {
  document.getElementById('basicSalary').value = 1200000;
  document.getElementById('hraReceived').value = 360000;
  document.getElementById('specialAllowance').value = 480000;
  document.getElementById('lta').value = 100000;
  document.getElementById('sec80c').value = 100000;
  document.getElementById('sec80d').value = 15000;
  document.getElementById('nps').value = 0;
  document.getElementById('homeLoan').value = 0;
  document.getElementById('rentPaid').value = 180000;
  switchInputTab('manual');
  analyzeTax();
}

function analyzeTax() {
  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');

  const basic = parseFloat(document.getElementById('basicSalary').value) || 1200000;
  const hra = parseFloat(document.getElementById('hraReceived').value) || 360000;
  const special = parseFloat(document.getElementById('specialAllowance').value) || 480000;
  const lta = parseFloat(document.getElementById('lta').value) || 0;
  const sec80c = Math.min(parseFloat(document.getElementById('sec80c').value) || 0, 150000);
  const sec80d = Math.min(parseFloat(document.getElementById('sec80d').value) || 0, 25000);
  const nps = Math.min(parseFloat(document.getElementById('nps').value) || 0, 50000);
  const homeLoan = Math.min(parseFloat(document.getElementById('homeLoan').value) || 0, 200000);
  const rentPaid = parseFloat(document.getElementById('rentPaid').value) || 0;

  const grossIncome = basic + hra + special + lta;

  // HRA Exemption calculation
  const hraExempt = calcHRAExemption(basic, hra, rentPaid, true); // metro assumed

  // OLD REGIME
  const stdDeduction = 50000;
  let totalDeductionsOld = stdDeduction + sec80c + sec80d + nps + homeLoan + hraExempt;
  let taxableOld = Math.max(0, grossIncome - totalDeductionsOld);
  let taxOld = calcOldRegimeTax(taxableOld);
  let taxOldFinal = taxOld + taxOld * 0.04; // 4% cess

  // NEW REGIME
  const stdDeductionNew = 75000; // FY 2024-25 new regime std deduction
  let taxableNew = Math.max(0, grossIncome - stdDeductionNew);
  let taxNew = calcNewRegimeTax(taxableNew);
  let taxNewFinal = taxNew + taxNew * 0.04;

  // Determine best
  const betterOld = taxOldFinal < taxNewFinal;
  const saving = Math.abs(taxOldFinal - taxNewFinal);

  // Update UI
  document.getElementById('oldTaxAmt').textContent = formatINR(taxOldFinal);
  document.getElementById('newTaxAmt').textContent = formatINR(taxNewFinal);
  document.getElementById('taxSavingAmt').textContent = formatINR(saving);

  if (betterOld) {
    document.getElementById('oldRegimeCard').classList.add('recommended');
    document.getElementById('newRegimeCard').classList.remove('recommended');
    document.getElementById('recommendedBadge').textContent = '✓ Old Regime Recommended';
    document.getElementById('savingNote').textContent = 'by choosing Old Regime (deductions help you more)';
  } else {
    document.getElementById('newRegimeCard').classList.add('recommended');
    document.getElementById('oldRegimeCard').classList.remove('recommended');
    document.getElementById('recommendedBadge').textContent = '✓ New Regime Recommended';
    document.getElementById('savingNote').textContent = 'by switching to New Regime (simpler slabs)';
  }

  // Draw comparison chart
  drawCompareChart(taxOldFinal, taxNewFinal, grossIncome);
  drawBreakdownChart(sec80c, hraExempt, sec80d, nps, homeLoan, stdDeduction);

  // Deduction tags
  renderDeductionTags(sec80c, sec80d, nps, homeLoan, hraExempt);

  // Missing deductions amount
  const missingNPS = 50000 - nps;
  const missing80c = 150000 - sec80c;
  const missing80d = 25000 - sec80d;
  let missings = [];
  if (missingNPS > 0) missings.push(`NPS: ₹${(missingNPS/1000).toFixed(0)}K extra deduction possible`);
  if (missing80c > 0) missings.push(`80C: ₹${(missing80c/1000).toFixed(0)}K unused limit`);
  if (missing80d > 0) missings.push(`80D: ₹${(missing80d/1000).toFixed(0)}K health cover can be increased`);
  document.getElementById('missingDeductionText').textContent = missings.length ? missings.join(' • ') : '✅ You are using all major deductions!';

  // Investment recommendations
  renderInvestmentRankings(user.risk_level || 'Moderate', missing80c, missingNPS);

  // Show results
  document.getElementById('resultsPanel').classList.add('show');

  // Try backend
  fetch('http://localhost:8000/tax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ basic, hra, special, lta, sec80c, sec80d, nps, home_loan: homeLoan, rent_paid: rentPaid })
  }).catch(() => {});
}

function calcHRAExemption(basic, hraReceived, rentPaid, isMetro) {
  if (rentPaid === 0) return 0;
  const metroFactor = isMetro ? 0.5 : 0.4;
  return Math.min(
    hraReceived,
    rentPaid - basic * 0.1,
    basic * metroFactor
  );
}

function calcOldRegimeTax(taxable) {
  let tax = 0;
  if (taxable <= 250000) return 0;
  if (taxable <= 500000) { tax = (taxable - 250000) * 0.05; }
  else if (taxable <= 1000000) { tax = 12500 + (taxable - 500000) * 0.2; }
  else { tax = 112500 + (taxable - 1000000) * 0.3; }
  // 87A rebate
  if (taxable <= 500000) tax = 0;
  return Math.max(0, tax);
}

function calcNewRegimeTax(taxable) {
  let tax = 0;
  const slabs = [
    [300000, 0], [600000, 0.05], [900000, 0.1],
    [1200000, 0.15], [1500000, 0.2], [Infinity, 0.3]
  ];
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable <= prev) break;
    const slab = Math.min(taxable, limit) - prev;
    tax += slab * rate;
    prev = limit;
  }
  // Rebate u/s 87A for new regime — income up to 7L
  if (taxable <= 700000) tax = 0;
  return Math.max(0, tax);
}

function drawCompareChart(oldTax, newTax, gross) {
  const ctx = document.getElementById('taxCompareChart').getContext('2d');
  if (taxCompareChart) taxCompareChart.destroy();
  taxCompareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Gross Income', 'Old Regime Tax', 'New Regime Tax'],
      datasets: [{
        data: [gross, oldTax, newTax],
        backgroundColor: [
          'rgba(59,130,246,0.7)',
          'rgba(239,68,68,0.7)',
          'rgba(16,185,129,0.7)'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ₹' + Math.round(c.raw).toLocaleString('en-IN') } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => '₹' + (v/100000).toFixed(1) + 'L' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function drawBreakdownChart(c80, hra, d80, nps, hl, std) {
  const ctx = document.getElementById('taxBreakdownChart').getContext('2d');
  if (taxBreakdownChart) taxBreakdownChart.destroy();
  const data = [std, c80, hra, d80, nps, hl].map(v => Math.max(0, Math.round(v)));
  const labels = ['Std Deduction', '80C', 'HRA', '80D', 'NPS', 'Home Loan'];
  taxBreakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899'], borderWidth: 2, borderColor: '#070b14' }]
    },
    options: {
      plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 12 }, padding: 12, boxWidth: 12 } }, tooltip: { callbacks: { label: c => ' ₹' + Math.round(c.raw).toLocaleString('en-IN') } } },
      cutout: '60%'
    }
  });
}

function renderDeductionTags(c80, d80, nps, hl, hra) {
  const container = document.getElementById('deductionTags');
  const items = [
    { name: '✓ Std Deduction ₹50K', found: true },
    { name: c80 >= 150000 ? '✓ 80C Full ₹1.5L' : `⚠️ 80C: ₹${(c80/1000).toFixed(0)}K of ₹1.5L`, found: c80 >= 150000 },
    { name: d80 >= 25000 ? '✓ 80D Full ₹25K' : `⚠️ 80D: ₹${(d80/1000).toFixed(0)}K of ₹25K`, found: d80 >= 25000 },
    { name: nps >= 50000 ? '✓ NPS ₹50K' : '✗ NPS not claimed', found: nps >= 50000 },
    { name: hl > 0 ? '✓ Home Loan Int.' : '— Home Loan', found: hl > 0 },
    { name: hra > 0 ? '✓ HRA Exempt' : '— HRA (rented)', found: hra > 0 },
  ];
  container.innerHTML = items.map(i =>
    `<span class="deduction-tag ${i.found ? 'found' : 'missing'}">${i.name}</span>`
  ).join('');
}

function renderInvestmentRankings(riskLevel, missing80c, missingNPS) {
  const all = [
    { name: 'ELSS Mutual Funds', desc: 'Best for aggressive investors. Market-linked returns ~12-15% CAGR. Lock-in: 3 years.', risk: 'High', liquidity: 'Low', section: '80C', limit: 150000, tags: ['badge-purple','badge-red'] },
    { name: 'PPF (Public Provident Fund)', desc: 'Risk-free, tax-free returns at ~7.1% p.a. Sovereign guarantee. Lock-in: 15 years.', risk: 'Low', liquidity: 'Very Low', section: '80C', limit: 150000, tags: ['badge-green','badge-yellow'] },
    { name: 'NPS (National Pension System)', desc: 'Extra ₹50K deduction over 80C. Mix of equity & debt. Locked till retirement.', risk: 'Moderate', liquidity: 'Very Low', section: '80CCD(1B)', limit: 50000, tags: ['badge-blue','badge-yellow'] },
    { name: 'SCSS (Senior Citizen Scheme)', desc: 'Safe 8.2% returns for senior citizens. Govt-backed. 5 yr term.', risk: 'Low', liquidity: 'Low', section: '80C', limit: 150000, tags: ['badge-green','badge-green'] },
    { name: 'NSC (National Savings Cert.)', desc: 'Governement bond at 7.7%. No TDS. Principal locked 5 years.', risk: 'Low', liquidity: 'Low', section: '80C', limit: 150000, tags: ['badge-green','badge-yellow'] },
    { name: 'ULIP (Unit Linked Ins Plan)', desc: 'Combines insurance + investment. Returns vary. Long lock-in 5 years.', risk: 'Moderate', liquidity: 'Low', section: '80C', limit: 150000, tags: ['badge-blue','badge-yellow'] },
  ];

  // Rank by risk match
  const riskOrder = { Low: 0, Moderate: 1, High: 2 };
  const userRisk = riskOrder[riskLevel] || 1;
  const sorted = all.sort((a, b) => Math.abs(riskOrder[a.risk] - userRisk) - Math.abs(riskOrder[b.risk] - userRisk));

  const container = document.getElementById('investmentList');
  document.getElementById('riskBadge').textContent = `${riskLevel} Risk Profile`;
  container.innerHTML = sorted.map((inv, i) => `
    <div class="investment-row">
      <div class="inv-rank">${i + 1}</div>
      <div class="inv-info" style="flex:1;margin:0 14px">
        <h4>${inv.name}</h4>
        <p>${inv.desc}</p>
      </div>
      <div class="inv-badges">
        <span class="badge ${inv.tags[0]}">${inv.risk}</span>
        <span class="badge ${inv.tags[1]}">${inv.liquidity} Liquidity</span>
        <span class="badge badge-purple">${inv.section}</span>
      </div>
    </div>
  `).join('');
}

function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// Auto-run on load with defaults
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('wp_token')) { window.location.href = '../auth.html'; return; }
  analyzeTax();
});
