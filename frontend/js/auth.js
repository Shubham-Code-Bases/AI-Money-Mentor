// ── AI-MoneyMentor Auth JS ──
// Handles registration (first-time) and login (returning users)

const API_BASE = 'http://localhost:8000';

async function handleLogin() {
  const btn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');
  const successDiv = document.getElementById('loginSuccess');
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError(errorDiv, '⚠️ Please enter your email and password.');
    return;
  }

  btn.classList.add('loading');

  try {
    // Try backend auth first
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      saveSession(data);
      redirectToDashboard();
      return;
    } else {
      throw new Error(data.detail || 'Invalid credentials');
    }
  } catch (err) {
    // Fallback: check localStorage store
    const stored = getStoredUsers();
    const user = stored.find(u => u.email === email && u.password === btoa(password));
    if (user) {
      saveLocalSession(user);
      showSuccess(successDiv, '✅ Welcome back! Redirecting…');
      setTimeout(redirectToDashboard, 900);
    } else {
      showError(errorDiv, '❌ ' + (err.message.includes('fetch') ? 'Incorrect email or password.' : err.message));
    }
  } finally {
    btn.classList.remove('loading');
  }
}

async function handleRegister() {
  const btn = document.getElementById('registerBtn');
  const errorDiv = document.getElementById('registerError');
  errorDiv.style.display = 'none';

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const income = parseFloat(document.getElementById('regIncome').value) || 2400000;
  const savings = parseFloat(document.getElementById('regSavings').value) || 1800000;
  const risk = document.getElementById('regRisk').value;
  const retirementAge = parseInt(document.getElementById('regRetirementAge').value) || 50;
  const goals = getSelectedGoals();

  if (!name) { showError(errorDiv, '⚠️ Full name is required.'); return; }
  if (!email || !email.includes('@')) { showError(errorDiv, '⚠️ Enter a valid email address.'); return; }
  if (password.length < 6) { showError(errorDiv, '⚠️ Password must be at least 6 characters.'); return; }

  // Check if email already registered locally
  const stored = getStoredUsers();
  if (stored.find(u => u.email === email)) {
    showError(errorDiv, '⚠️ This email is already registered. Please login instead.');
    return;
  }

  btn.classList.add('loading');

  const payload = { name, email, password, income, savings, risk_level: risk, target_retirement_age: retirementAge, goals };

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      saveLocalUser(payload);
      saveLocalSession({ name, email, income, savings, risk_level: risk, target_retirement_age: retirementAge, goals });
      redirectToDashboard();
    } else {
      throw new Error(data.detail || 'Registration failed');
    }
  } catch (err) {
    // Offline fallback — save locally
    if (err.message.includes('fetch') || err.message.includes('Failed')) {
      saveLocalUser(payload);
      saveLocalSession({ name, email, income, savings, risk_level: risk, target_retirement_age: retirementAge, goals });
      redirectToDashboard();
    } else {
      showError(errorDiv, '❌ ' + err.message);
    }
  } finally {
    btn.classList.remove('loading');
  }
}

// ── Helpers ──
function showError(div, msg) {
  div.textContent = msg;
  div.style.display = 'block';
}
function showSuccess(div, msg) {
  div.textContent = msg;
  div.style.display = 'block';
}

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem('wp_users') || '[]'); } catch { return []; }
}
function saveLocalUser(user) {
  const users = getStoredUsers();
  users.push({ ...user, password: btoa(user.password) });
  localStorage.setItem('wp_users', JSON.stringify(users));
}
function saveLocalSession(user) {
  localStorage.setItem('wp_token', 'local_' + Date.now());
  localStorage.setItem('wp_user', JSON.stringify({
    name: user.name,
    email: user.email,
    income: user.income || user.income,
    savings: user.savings || user.current_savings,
    risk_level: user.risk_level,
    target_retirement_age: user.target_retirement_age,
    goals: user.goals || []
  }));
}
function saveSession(data) {
  localStorage.setItem('wp_token', data.token);
  localStorage.setItem('wp_user', JSON.stringify(data.user || data));
}
function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}
function getSelectedGoals() {
  return [...(document.querySelectorAll('.goal-chip.checked') || [])]
    .map(c => c.querySelector('input').value);
}
