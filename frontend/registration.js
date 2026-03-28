document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('loadingSpinner');

    // UI state change
    btnSubmit.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    // Collect data
    const userName = document.getElementById('userName').value;
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);
    const currentSavings = parseFloat(document.getElementById('currentSavings').value);
    const riskLevel = document.getElementById('riskLevel').value;
    const targetAge = parseInt(document.getElementById('targetAge').value);
    
    // Collect checked goals
    const goals = [];
    document.querySelectorAll('.checkbox-label input[type="checkbox"]:checked').forEach(cb => {
        goals.push(cb.value);
    });
    
    // If no goals checked, add a default
    if(goals.length === 0) {
        goals.push("Growth");
    }

    const payload = {
        name: userName,
        income: annualIncome,
        goals: goals,
        risk_level: riskLevel,
        target_retirement_age: targetAge,
        current_savings: currentSavings
    };

    try {
        const response = await fetch('http://localhost:8000/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Store name locally to greet user on dashboard
            localStorage.setItem('ai_mentor_user_name', userName);
            // Also store profile details
            localStorage.setItem('ai_mentor_profile', JSON.stringify(payload));
            
            // Redirect to dashboard
            window.location.href = 'index.html';
        } else {
            console.error('Error saving profile', await response.text());
            alert('Failed to save profile. Please try again.');
            btnSubmit.disabled = false;
            btnText.style.display = 'block';
            spinner.style.display = 'none';
        }
    } catch (err) {
        console.error('Network Error', err);
        alert('Could not connect to backend server. Make sure it is running.');
        btnSubmit.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
});
