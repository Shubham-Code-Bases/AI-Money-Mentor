// ── Ask AI Mentor JS ──
// Calls /chat endpoint (Gemini backend) with user profile context fallback

const API_BASE = 'http://localhost:8000';
const CHAT_KEY = 'wp_chat_history';
let isTyping = false;

function initChat() {
  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
  const name = (user.name || 'there').split(' ')[0];

  const welcome = buildWelcomeMessage(user, name);
  appendMessage('ai', welcome);
  loadChatHistory();
}

function buildWelcomeMessage(user, name) {
  const income = user.income ? `₹${(user.income/100000).toFixed(0)}L` : 'unknown';
  const risk = user.risk_level || 'Moderate';
  const goals = (user.goals || []).join(', ') || 'general wealth building';

  return `👋 Hi ${name}! I'm your **AI-MoneyMentor AI Mentor**, powered by Google Gemini.

I already know your profile:
• **Income**: ${income}/year • **Risk**: ${risk} • **Goals**: ${goals}

I can help you with:
→ Tax optimization strategies  
→ Mutual fund selection & portfolio review  
→ FIRE planning & retirement corpus  
→ Insurance gap analysis  
→ Debt management & SIP planning  
→ Any specific financial question!

**What's on your mind today?** 💬`;
}

function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
  history.forEach(msg => appendMessage(msg.role, msg.text, false));
}

function saveChatHistory(role, text) {
  const history = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
  history.push({ role, text, time: Date.now() });
  // Keep last 50 messages
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem(CHAT_KEY, JSON.stringify(history));
}

function clearChat() {
  if (!confirm('Clear chat history?')) return;
  localStorage.removeItem(CHAT_KEY);
  document.getElementById('chatMessages').innerHTML = '';
  initChat();
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  autoResize(input);

  appendMessage('user', text);
  saveChatHistory('user', text);

  // Show typing indicator
  showTyping();

  const user = JSON.parse(localStorage.getItem('wp_user') || '{}');
  const context = buildContext(user);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, context })
    });
    const data = await res.json();
    hideTyping();
    const reply = data.response || data.reply || data.message || 'I received your message but got an unexpected response format.';
    appendMessage('ai', reply);
    saveChatHistory('ai', reply);
  } catch (err) {
    hideTyping();
    const fallback = getFallbackResponse(text, user);
    appendMessage('ai', fallback);
    saveChatHistory('ai', fallback);
  }
}

function sendPrompt(text) {
  document.getElementById('chatInput').value = text;
  sendMessage();
}

function buildContext(user) {
  return {
    name: user.name,
    income: user.income,
    savings: user.savings,
    risk_level: user.risk_level,
    target_retirement_age: user.target_retirement_age,
    goals: user.goals
  };
}

function appendMessage(role, text, animate = true) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const html = markdownToHtml(text);

  div.innerHTML = `
    <div class="msg-avatar ${role}">${role === 'ai' ? '🤖' : '👤'}</div>
    <div>
      <div class="msg-bubble">${html}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function markdownToHtml(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/→ (.*)/g, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent-purple)">→</span><span>$1</span></div>')
    .replace(/• (.*)/g, '<div style="display:flex;gap:8px;margin:2px 0"><span style="color:var(--accent-purple)">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  isTyping = true;
  document.getElementById('sendBtn').disabled = true;
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="msg-avatar ai">🤖</div>
    <div class="msg-bubble" style="padding:16px 18px">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  isTyping = false;
  document.getElementById('sendBtn').disabled = false;
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// Intelligent fallback responses when API is offline
function getFallbackResponse(question, user) {
  const q = question.toLowerCase();
  const income = user.income || 2400000;
  const risk = user.risk_level || 'Moderate';
  const name = (user.name || 'there').split(' ')[0];

  if (q.includes('nps') || q.includes('national pension')) {
    return `Great question, ${name}! 🏛️\n\n**NPS Benefits for You:**\n• **Extra ₹50,000 deduction** under Section 80CCD(1B) — over and above the ₹1.5L limit of 80C\n• At your income of ₹${(income/100000).toFixed(0)}L, this saves **₹15,000–18,750 in tax** (30% bracket)\n\n**How to invest:**\n→ Open NPS via Zerodha, Groww, or your bank\n→ Choose Active Choice with 75% equity (for ${risk} risk profile)\n→ Tier I is tax-advantaged (locked till 60); Tier II is flexible\n\n**One caveat:** Annuity at maturity is taxable. Best for long-term retirement planning (your target: age ${user.target_retirement_age || 50}).`;
  }

  if (q.includes('elss') || q.includes('ppf')) {
    return `**ELSS vs PPF — Quick Comparison** 📊\n\n| Feature | ELSS | PPF |\n|---------|------|-----|\n| Returns | 12–15% (market-linked) | 7.1% (guaranteed) |\n| Lock-in | 3 years | 15 years |\n| Tax on returns | LTCG >₹1L | Tax-free |\n| Risk | ${risk === 'High' ? 'Perfect for you' : 'Moderate'} | Zero |\n\n**For your ${risk} risk profile:**\n→ Invest ₹${Math.round(income*0.05/1000)}K/year in ELSS (Mirae Asset or Axis)\n→ ₹${Math.round(income*0.05/1000)}K/year in PPF for guaranteed base\n→ Split maximizes both growth + safety 🎯`;
  }

  if (q.includes('tax regime') || q.includes('new regime') || q.includes('old regime')) {
    return `**Tax Regime Decision for You** 🧮\n\n**Use Old Regime if:** You have HRA + 80C (₹1.5L) + 80D + NPS claims totaling > ₹3.75L\n\n**Use New Regime if:** Few deductions or you prefer simplicity. Slab: 0% up to ₹3L, 5% up to ₹6L, 10% up to ₹9L...\n\n**For your income of ₹${(income/100000).toFixed(0)}L:**\n→ Run the **Tax Wizard** module for exact numbers with your salary structure\n→ It calculates both regimes and finds your exact saving\n\nQuick answer: If 80C + HRA + 80D > ₹2.5L in deductions, Old Regime likely wins. 🎯`;
  }

  if (q.includes('sip') || q.includes('mutual fund') || q.includes('invest')) {
    const sipAmt = Math.round(income * 0.25 / 12 / 1000) * 1000;
    return `**SIP Strategy for ₹${(income/100000).toFixed(0)}L income** 📈\n\n**Ideal monthly SIP: ₹${(sipAmt/1000).toFixed(0)}K** (25% of income)\n\n**Split by risk (${risk}):**\n→ **Large Cap Index (Nifty 50):** ₹${Math.round(sipAmt*0.4/1000)}K — Core, stable\n→ **Flexi Cap (PPFAS/Mirae):** ₹${Math.round(sipAmt*0.3/1000)}K — Growth\n→ **Mid Cap:** ₹${Math.round(sipAmt*0.2/1000)}K — Higher return potential\n→ **Liquid Fund (Emergency):** ₹${Math.round(sipAmt*0.1/1000)}K — Safety net\n\n**Golden rule: Increase SIP by 10% every January** — Step-up SIP accelerates wealth significantly! 🚀`;
  }

  if (q.includes('insurance') || q.includes('term') || q.includes('cover')) {
    const cover = income * 15;
    return `**Insurance Planning for You** 🛡️\n\n**Recommended Coverage:**\n→ **Term Life:** ₹${(cover/10000000).toFixed(1)}Cr (15× annual income)\n→ **Health (Family Floater):** ₹10–25L + Super Top-up ₹50L\n→ **Critical Illness:** ₹25–50L rider\n\n**Best term plans (2024–25):**\n• HDFC Click2Protect Life (₹1Cr = ~₹10K/year for 30-year-old)\n• Max Life Smart Secure Plus\n• Tata AIA Smart GenX\n\nVisit the **Insurance Audit** module for your personalized gap analysis! 🎯`;
  }

  return `I understand you're asking about "${question}".\n\nFor a detailed analysis tailored to your profile:\n→ **Income:** ₹${(income/100000).toFixed(0)}L | **Risk:** ${risk} | **Goals:** ${(user.goals||[]).join(', ')||'Wealth building'}\n\nPlease try one of the specific modules:\n• **Tax Wizard** for tax queries\n• **MF X-Ray** for portfolio questions  \n• **FIRE Planner** for retirement planning\n• **Goal Tracker** for goal-specific advice\n\nOr I can connect to the Gemini API backend for a more detailed personalized response. Start the backend server to enable full AI capabilities! 🤖`;
}
