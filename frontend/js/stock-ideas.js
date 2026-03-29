// ── Stock Ideas JS ──
let currentSector = 'All', currentRisk = 'All';
const ALL_STOCKS = [
  { ticker:'TATAPOWER', name:'Tata Power Company Ltd', price:'₹392', sector:'Renewable Energy', risk:'Moderate', confidence:87, target:'₹460', thesis:'Govt solar push + EV charging expansion. Strong order book worth ₹28,000 Cr. Positive news sentiment on green energy push.', change:'+3.2%', up:true },
  { ticker:'INFY', name:'Infosys Ltd', price:'₹1,640', sector:'Technology', risk:'Low', confidence:82, target:'₹1,850', thesis:'AI deal pipeline growing 40% YoY. Strong dollar revenue with robust margins. Consistent dividend payer. Defensive in volatile markets.', change:'+1.1%', up:true },
  { ticker:'SBIN', name:'State Bank of India', price:'₹796', sector:'Banking', risk:'Moderate', confidence:79, target:'₹920', thesis:'Loan book growing 15% YoY. GNPA at decade-low 2.2%. RBI rate cut cycle to improve NIMs. Attractive P/B of 1.4x vs peers.', change:'+0.8%', up:true },
  { ticker:'APOLLOHOSP', name:'Apollo Hospitals Enterprise', price:'₹6,890', sector:'Healthcare', risk:'Low', confidence:85, target:'₹7,800', thesis:'Healthcare demand secular growth story. Apollo 24|7 digital platform scaling fast. Insurance penetration improving margins.', change:'+2.4%', up:true },
  { ticker:'IRFC', name:'Indian Railway Finance Corp', price:'₹174', sector:'Infrastructure', risk:'Low', confidence:77, target:'₹210', thesis:'AAA-rated NBFC backed by Govt of India. 100% capex funding for Indian Railways. 15% CAGR in book value.', change:'+0.3%', up:true },
  { ticker:'ZOMATO', name:'Zomato Ltd', price:'₹218', sector:'Technology', risk:'High', confidence:72, target:'₹280', thesis:'Quick commerce Blinkit growing 90% QoQ. Path to sustainable profitability in FY26. Hyperpure B2B segment underappreciated.', change:'-1.2%', up:false },
  { ticker:'ADANIENT', name:'Adani Enterprises Ltd', price:'₹2,340', sector:'Infrastructure', risk:'High', confidence:68, target:'₹2,800', thesis:'Massive infra pipeline: airports, green H2, roads. Higher risk due to leverage but top-line growth story intact.', change:'+4.1%', up:true },
  { ticker:'SUNPHARMA', name:'Sun Pharmaceutical Ind.', price:'₹1,720', sector:'Healthcare', risk:'Moderate', confidence:83, target:'₹1,960', thesis:'US specialty portfolio growing. Ilumya & Winlevi scaling in dermatology. Strong API business. Defensive EPS visibility.', change:'+1.7%', up:true },
];

let sectorChart = null, riskChart = null;

function initStocks(riskLevel) {
  renderStocks(ALL_STOCKS);
  drawSectorChart();
  drawRiskChart(riskLevel);
}

function renderStocks(stocks) {
  const filtered = stocks.filter(s => {
    const sMatch = currentSector === 'All' || s.sector === currentSector;
    const rMatch = currentRisk === 'All' || s.risk === currentRisk;
    return sMatch && rMatch;
  });

  document.getElementById('stocksGrid').innerHTML = filtered.map(s => {
    const color = s.up ? 'var(--accent-green)' : 'var(--accent-red)';
    const riskColor = s.risk === 'High' ? '#ef4444' : s.risk === 'Moderate' ? '#f59e0b' : '#10b981';
    return `
      <div class="stock-card" onclick="void(0)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="stock-ticker" style="color:var(--accent-purple)">${s.ticker}</div>
            <div class="stock-name">${s.name}</div>
          </div>
          <span class="badge" style="color:${riskColor};border:1px solid ${riskColor}30;background:${riskColor}15">${s.risk} Risk</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:10px;margin:12px 0 4px">
          <div class="stock-price">${s.price}</div>
          <span style="font-size:13px;color:${color};font-weight:600">${s.change}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Target: <strong style="color:var(--accent-green)">${s.target}</strong> &bull; Sector: ${s.sector}</div>
        <div class="stock-thesis">${s.thesis}</div>
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
            <span>AI Confidence</span><span style="font-weight:700;color:${s.confidence > 80 ? 'var(--accent-green)' : 'var(--accent-yellow)'}">${s.confidence}%</span>
          </div>
          <div class="confidence-bar"><div class="confidence-fill" style="width:${s.confidence}%;background:${s.confidence>80?'var(--grad-green)':'var(--grad-gold)'}"></div></div>
        </div>
      </div>
    `;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No stocks match current filters</div>';
}

function filterStocks(sector, btn) {
  currentSector = sector;
  document.querySelectorAll('#sectorFilters .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStocks(ALL_STOCKS);
}

function filterRisk(risk, btn) {
  currentRisk = risk;
  document.querySelectorAll('.filter-chips:last-child .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStocks(ALL_STOCKS);
}

function drawSectorChart() {
  const sectors = {};
  ALL_STOCKS.forEach(s => sectors[s.sector] = (sectors[s.sector] || 0) + 1);
  const ctx = document.getElementById('sectorChart').getContext('2d');
  if (sectorChart) sectorChart.destroy();
  sectorChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(sectors),
      datasets: [{ data: Object.values(sectors), backgroundColor: ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'], borderWidth: 2, borderColor: '#070b14' }]
    },
    options: { plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 14, boxWidth: 12 } } }, cutout: '60%' }
  });
}

function drawRiskChart(userRisk) {
  const counts = { Low: 0, Moderate: 0, High: 0 };
  ALL_STOCKS.forEach(s => counts[s.risk]++);
  const ctx = document.getElementById('riskChart').getContext('2d');
  if (riskChart) riskChart.destroy();
  riskChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
      datasets: [{
        label: 'Number of picks',
        data: [counts.Low, counts.Moderate, counts.High],
        backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'],
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } }
    }
  });
}
