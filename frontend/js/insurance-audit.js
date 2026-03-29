// ── Insurance Audit JS ──
let coverageChart = null;

function runAudit() {
  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
  const income = user.income || 2400000;
  const termCover = parseFloat(document.getElementById('termCover').value) || 0;
  const healthCover = parseFloat(document.getElementById('healthCover').value) || 0;
  const termPremium = parseFloat(document.getElementById('termPremium').value) || 0;
  const healthPremium = parseFloat(document.getElementById('healthPremium').value) || 0;
  const familySize = parseInt(document.getElementById('familySize').value) || 3;
  const criticalIllness = parseFloat(document.getElementById('criticalIllness').value) || 0;

  // Required coverage
  const requiredTerm = income * 15;
  const requiredHealth = familySize <= 2 ? 500000 : familySize <= 4 ? 1000000 : 1500000;
  const requiredCritical = income * 2;

  // Gaps
  const termGap = requiredTerm - termCover;
  const healthGap = requiredHealth - healthCover;
  const criticalGap = requiredCritical - criticalIllness;

  // Score
  const termScore = Math.min(40, Math.round((termCover / requiredTerm) * 40));
  const healthScore = Math.min(35, Math.round((healthCover / requiredHealth) * 35));
  const criticalScore = criticalIllness > 0 ? 25 : 0;
  const totalScore = termScore + healthScore + criticalScore;

  document.getElementById('auditResults').style.display = 'block';

  // Stats
  document.getElementById('insuranceStats').innerHTML = [
    { label: 'Coverage Score', value: totalScore + '/100', color: totalScore >= 70 ? '#10b981' : totalScore >= 50 ? '#f59e0b' : '#ef4444', sub: totalScore >= 70 ? 'Well covered' : 'Gaps exist' },
    { label: 'Term Life Adequacy', value: termCover > 0 ? Math.min(100, Math.round(termCover/requiredTerm*100))+'%' : 'None', color: termGap > 0 ? '#ef4444' : '#10b981', sub: `Recommended: ${formatINR(requiredTerm)}` },
    { label: 'Health Cover Adequacy', value: healthCover > 0 ? Math.min(100, Math.round(healthCover/requiredHealth*100))+'%' : 'None', color: healthGap > 0 ? '#ef4444' : '#10b981', sub: `Recommended: ${formatINR(requiredHealth)}` },
    { label: 'Annual Premium Total', value: formatINR(termPremium + healthPremium), color: '#6366f1', sub: 'Total insurance spend/year' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="color:${s.color}">${s.value}</div>
      <div class="stat-change">${s.sub}</div>
    </div>
  `).join('');

  // Coverage chart
  drawCoverageChart(termCover, healthCover, criticalIllness, requiredTerm, requiredHealth, requiredCritical);

  // Findings
  const findings = [];
  if (termGap > 0) findings.push({ icon:'🚨', text:`Term life gap of ${formatINR(termGap)} — You need ${formatINR(requiredTerm)} (15× income) for family security.`, type:'danger' });
  else if (termCover > requiredTerm * 1.5) findings.push({ icon:'⚠️', text:`You may be over-insured on term. ${formatINR(termCover)} vs recommended ${formatINR(requiredTerm)}.`, type:'warning' });
  else findings.push({ icon:'✅', text:`Term life cover is adequate at ${formatINR(termCover)}.`, type:'success' });

  if (healthGap > 0) findings.push({ icon:'🚨', text:`Health cover gap of ${formatINR(healthGap)} for your family of ${familySize}. Medical inflation is 15%/year.`, type:'danger' });
  else findings.push({ icon:'✅', text:`Health insurance looks adequate for your family size.`, type:'success' });

  if (criticalGap > 0 && criticalIllness === 0) findings.push({ icon:'⚠️', text:`No critical illness cover — consider a ₹25–50L rider for cancer, heart attack coverage.`, type:'warning' });
  else if (criticalIllness > 0) findings.push({ icon:'✅', text:`Critical illness cover of ${formatINR(criticalIllness)} is a good safety net.`, type:'success' });

  document.getElementById('auditFindings').innerHTML = findings.map(f => `
    <div class="alert ${f.type==='danger'?'alert-danger':f.type==='warning'?'alert-warning':'alert-success'}" style="margin-bottom:10px">
      ${f.icon} ${f.text}
    </div>
  `).join('');

  // Recommendations
  const recs = [];
  if (termGap > 0) recs.push({ title:`Increase Term Cover by ${formatINR(termGap)}`, desc:`A ${formatINR(termGap)} pure term plan for a 30-year-old costs approx ₹${Math.round(termGap/2000).toLocaleString()}/year with a 30-year tenure. Compare: LIC Tech Term, HDFC Click2Protect, SBI eTerm.`, color:'#ef4444' });
  if (healthGap > 0) recs.push({ title:`Upgrade Health Cover by ${formatINR(healthGap)}`, desc:`Get a family floater policy with super top-up. Niva Bupa ReAssure, Care Supreme, or HDFC Optima Secure offer ${formatINR(requiredHealth)} at ~₹${(requiredHealth/50).toLocaleString()}/year.`, color:'#f59e0b' });
  if (criticalIllness === 0) recs.push({ title:'Add Critical Illness Rider', desc:`A ₹25L CI rider on your term plan costs only ₹2,000–4,000/year extra. Covers cancer, heart attack, stroke, kidney failure. Lump sum payout on diagnosis.`, color:'#6366f1' });
  recs.push({ title:'Annual Insurance Review', desc:`Review policies every year or after major life events (marriage, child, job change). Ensure nominees are up-to-date. Consider a ₹1Cr super top-up health plan for medical inflation protection.`, color:'#10b981' });

  document.getElementById('insuranceRecs').innerHTML = recs.map((r, i) => `
    <div style="display:flex;gap:14px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="width:32px;height:32px;border-radius:50%;background:${r.color}20;color:${r.color};display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${i+1}</div>
      <div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:${r.color}">${r.title}</div>
        <p style="font-size:13px;color:var(--text-muted);line-height:1.6">${r.desc}</p>
      </div>
    </div>
  `).join('');
}

function drawCoverageChart(term, health, critical, reqTerm, reqHealth, reqCritical) {
  const ctx = document.getElementById('coverageChart').getContext('2d');
  if (coverageChart) coverageChart.destroy();
  coverageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Term Life', 'Health Cover', 'Critical Illness'],
      datasets: [
        { label: 'Current Cover', data: [term, health, critical], backgroundColor: ['rgba(99,102,241,0.7)','rgba(16,185,129,0.7)','rgba(6,182,212,0.7)'], borderRadius: 6 },
        { label: 'Recommended', data: [reqTerm, reqHealth, reqCritical], backgroundColor: ['rgba(239,68,68,0.3)','rgba(245,158,11,0.3)','rgba(236,72,153,0.3)'], type: 'line', borderColor: '#f59e0b', borderDash: [5,3], fill: false, pointRadius: 5 }
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
  if (n >= 10000000) return '₹' + (n/10000000).toFixed(1)+'Cr';
  if (n >= 100000) return '₹' + (n/100000).toFixed(1)+'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
