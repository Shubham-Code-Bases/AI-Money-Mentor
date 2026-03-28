document.addEventListener("DOMContentLoaded", () => {
    // 0. Check User Profile Enforcement
    const userName = localStorage.getItem('ai_mentor_user_name');
    if (!userName) {
        window.location.href = 'registration.html';
        return;
    }
    
    document.getElementById('greetingName').innerText = `Hi ${userName}!`;

    // 1. Render Health Score (Chart.js Half Donut gauge)
    const ctxHealth = document.getElementById("healthScoreChart").getContext("2d");
    new Chart(ctxHealth, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [62, 38], // Score, Remaining
                backgroundColor: ["#10B981", "#E5E7EB"],
                borderWidth: 0,
                cutout: "75%",
                rotation: -90,
                circumference: 180,
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { tooltip: { enabled: false }, legend: { display: false } } 
        }
    });

    // 2. Render Mock SIP Chart
    const ctxSip = document.getElementById("sipChart").getContext("2d");
    new Chart(ctxSip, {
        type: "bar",
        data: {
            labels: ["Yr 1", "Yr 2", "Yr 3", "Yr 4", "Yr 5", "Yr 6", "Yr 7", "Yr 8", "Yr 9", "Yr 10"],
            datasets: [{
                label: "Projected Corpus",
                data: [3.6, 7.8, 12.5, 18.0, 24.5, 32.0, 40.5, 50.5, 62.0, 75.0],
                backgroundColor: "rgba(37, 99, 235, 0.8)",
                borderRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { callback: (value)=> "₹" + value + "L"} },
                x: { grid: { display: false } }
            }
        }
    });

    // Fetch APIs
    fetchOpportunities();
    fetchTax();
    fetchNews();
});

async function fetchOpportunities() {
    try {
        const res = await fetch("http://localhost:8000/recommend");
        const opps = await res.json();
        
        document.getElementById("loader").style.display = "none";
        
        if(opps && opps.length > 0 && !opps[0].error) {
            const topOpp = opps[0];
            const ul = document.getElementById("oppDetailsList");
            ul.innerHTML = `
                <li><span class="label">Sector:</span> <span class="val fw-bold">${topOpp.sector}</span></li>
                <li><span class="label">Opportunity:</span> <span class="val fw-bold" style="color:#1A56DB">${topOpp.stock}</span></li>
                <li><span class="label">Scenario:</span> <span class="val info">${topOpp.reason}</span></li>
                <li><span class="label">Risk Profile:</span> <span class="val">${topOpp.risk}</span></li>
                <li><span class="label">Confidence Score:</span> <span class="val" style="color:#10B981; font-weight:bold;">${topOpp.confidence || 85}%</span></li>
                <li><span class="label" style="font-size:0.75rem; color:#9CA3AF; text-align:center; width: 100%; display:block; margin-top:1rem;">Verified AI Suggestion. ${topOpp.disclaimer || ""}</span></li>
            `;
            document.getElementById("oppResult").style.display = "block";
            document.getElementById("investBtn").innerText = `Invest in ${topOpp.stock}`;
        } else {
            throw new Error(opps[0]?.error || "No opportunities returned");
        }
    } catch(err) {
        document.getElementById("loader").innerText = "Using Mock Data (API unavailable).";
        
        // Mock fallback immediately
        setTimeout(() => {
            document.getElementById("loader").style.display = "none";
            const ul = document.getElementById("oppDetailsList");
            ul.innerHTML = `
                <li><span class="label">Sector:</span> <span class="val fw-bold">Renewable Energy</span></li>
                <li><span class="label">Opportunity:</span> <span class="val fw-bold" style="color:#1A56DB">Tata Power</span></li>
                <li><span class="label">Scenario:</span> <span class="val info">Govt solar push + positive news</span></li>
                <li><span class="label">Risk Profile:</span> <span class="val">Moderate</span></li>
                <li><span class="label">Confidence Score:</span> <span class="val" style="color:#10B981; font-weight:bold;">82%</span></li>
                <li><span class="label" style="font-size:0.75rem; color:#9CA3AF; text-align:center; width: 100%; display:block; margin-top:1rem;">Mock verified AI Suggestion. This is not financial advice.</span></li>
            `;
            document.getElementById("oppResult").style.display = "block";
            document.getElementById("investBtn").innerText = `Invest in Tata Power`;
        }, 800);
        console.error(err);
    }
}

async function fetchTax() {
    try {
        const res = await fetch("http://localhost:8000/tax");
        const tax = await res.json();
        const container = document.getElementById("taxContainer");
        container.innerHTML = `
            <div class="tax-box">
                <h4>Old Regime</h4>
                <p>₹${tax.old_regime.tax_payable.toLocaleString()}</p>
            </div>
            <div class="tax-box" style="background: #ECFDF5; border-color: #10B981;">
                <h4 style="color:#065F46;">New Regime</h4>
                <p style="color:#047857;">₹${tax.new_regime.tax_payable.toLocaleString()}</p>
            </div>
            <div style="grid-column: span 2; font-weight: 600; font-size: 0.95rem; margin-top: 0.5rem; text-align:center;">
                ✅ Recommended: <span style="color:#10B981;">${tax.recommended}</span> (Save ₹${tax.savings.toLocaleString()})
            </div>
        `;
    } catch(err) {
        // mock
        document.getElementById("taxContainer").innerHTML = `
            <div class="tax-box"><h4>Old Regime</h4><p>₹2,13,600</p></div>
            <div class="tax-box" style="background: #ECFDF5; border-color: #10B981;"><h4 style="color:#065F46;">New Regime</h4><p style="color:#047857;">₹2,04,000</p></div>
            <div style="grid-column: span 2; font-weight: 600; font-size: 0.95rem; margin-top: 0.5rem; text-align:center;">✅ Recommended: <span style="color:#10B981;">Switch to New Regime</span> (Save ₹9,600)</div>
        `;
    }
}

async function fetchNews() {
    try {
        const res = await fetch("http://localhost:8000/scan");
        const scanData = await res.json();
        const newsList = document.getElementById("scanAlerts");
        let html = "";
        if(scanData.news_sentiment) {
            scanData.news_sentiment.forEach(n => {
                const isPos = n.sentiment.toLowerCase() === "positive";
                const isNeg = n.sentiment.toLowerCase() === "negative";
                const color = isPos ? "#10B981" : (isNeg ? "#EF4444" : "#6B7280");
                const icon = isPos ? "📈" : (isNeg ? "📉" : "📊");
                
                html += `<li><strong style="color: ${color}">${icon} ${n.sentiment}</strong> ${n.title}</li>`;
            });
        }
        newsList.innerHTML = html || "<li>No major alerts today.</li>";
    } catch(err) {
        document.getElementById("scanAlerts").innerHTML = `
            <li><strong style="color: #10B981">📈 Positive</strong> Govt announces massive solar subsidy push.</li>
            <li><strong style="color: #10B981">📈 Positive</strong> RBI cuts repo rate by 0.5%.</li>
            <li><strong style="color: #6B7280">📊 Neutral</strong> New tax slab modifications detailed.</li>
        `;
    }
}
