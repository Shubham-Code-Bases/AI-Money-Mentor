// ── AI-MoneyMentor Dashboard JS ──

const API = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  const token = localStorage.getItem('wp_token');
  if (!token) { window.location.href = 'auth.html'; return; }

  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');

  // Populate user info
  const name = user.name || 'Pilot';
  const firstName = name.split(' ')[0];
  document.getElementById('heroName').textContent = firstName + '!';
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarEmail').textContent = user.email || '';
  document.getElementById('sidebarAvatar').textContent = firstName[0].toUpperCase();

  // Time greeting
  const hour = new Date().getHours();
  document.getElementById('timeOfDay').textContent = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  // Quick stats
  const income = user.income || 2400000;
  const savings = user.savings || 1800000;
  const retAge = user.target_retirement_age || 50;
  const currentAge = 30; // placeholder — could be stored in profile
  const yearsToFire = retAge - currentAge;

  document.getElementById('statIncome').textContent = formatCurrency(income);
  document.getElementById('statSavings').textContent = formatCurrency(savings);
  document.getElementById('statFireAge').textContent = retAge;
  document.getElementById('statFireYears').textContent = yearsToFire + ' years away';
  document.getElementById('statRisk').textContent = user.risk_level || 'Moderate';

  // Health score
  const score = calcHealthScore(user);
  document.getElementById('healthNum').textContent = score;
  const status = score >= 80 ? '🌟 Excellent' : score >= 65 ? '✅ Good' : score >= 50 ? '⚠️ Fair' : '❗ Poor';
  document.getElementById('healthStatus').textContent = status;

  // Draw health gauge
  drawHealthGauge(score);

  // Animate cards in
  animateSectionCards();

  // Try to fetch live AI banner data
  fetchBannerInsights(user);
});

function drawHealthGauge(score) {
  const ctx = document.getElementById('healthGaugeChart').getContext('2d');
  const color = score >= 80 ? '#10b981' : score >= 65 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, 'rgba(255,255,255,0.06)'],
        borderWidth: 0, cutout: '78%',
        rotation: -90, circumference: 180
      }]
    },
    options: {
      responsive: false, maintainAspectRatio: false,
      plugins: { tooltip: { enabled: false }, legend: { display: false } }
    }
  });
}

function calcHealthScore(user) {
  let score = 0;
  const income = user.income || 2400000;
  const savings = user.savings || 1800000;

  // Emergency fund (savings >= 6 months expense)
  const monthlyExpense = income / 12 * 0.6;
  if (savings >= monthlyExpense * 6) score += 20;
  else if (savings >= monthlyExpense * 3) score += 12;

  // Savings rate
  const savingsRate = savings / income;
  if (savingsRate >= 0.3) score += 20;
  else if (savingsRate >= 0.2) score += 14;
  else if (savingsRate >= 0.1) score += 8;

  // Has goals
  const goals = user.goals || [];
  if (goals.length >= 2) score += 15;
  else if (goals.length >= 1) score += 8;

  // Risk awareness
  if (user.risk_level) score += 10;

  // FIRE planning
  if (user.target_retirement_age && user.target_retirement_age <= 55) score += 15;

  // Base score
  score += 20;

  return Math.min(score, 99);
}

function animateSectionCards() {
  const cards = document.querySelectorAll('.section-module-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + i * 60);
  });
}

async function fetchBannerInsights(user) {
  try {
    const res = await fetch(`${API}/dashboard-insights`);
    const data = await res.json();
    if (data.insights) {
      document.getElementById('bannerText').textContent = data.insights.join(' • ');
    }
  } catch { /* Keep default mock banner */ }
}

function formatCurrency(n) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + n;
}

function navTo(path) { window.location.href = path; }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('wp_token');
    localStorage.removeItem('wp_user');
    window.location.href = 'auth.html';
  }
}
