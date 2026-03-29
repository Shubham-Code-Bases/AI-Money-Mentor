from .state import AgentState
import logging

def tax_computation_node(state: AgentState):
    """
    Computes tax regimes matching the PS9 document rules.
    Takes parsed data and runs standard old vs new slab calculations.
    """
    logging.info("Agent [Tax Computation]: Calculating Old vs New Regime...")
    
    data = state.get("parsed_data", {})
    basic = data.get("basic", 0)
    hra_recv = data.get("hra", 0)
    special = data.get("special", 0)
    lta = data.get("lta", 0)
    sec80c = min(data.get("sec80c", 0), 150000)
    sec80d = min(data.get("sec80d", 0), 25000)
    nps = min(data.get("nps", 0), 50000)
    home_loan = min(data.get("home_loan", 0), 200000)
    rent_paid = data.get("rent_paid", 0)

    gross = basic + hra_recv + special + lta
    
    # HRA
    hra_exempt = 0.0
    if rent_paid > 0:
        hra_exempt = max(0, min(hra_recv, rent_paid - basic * 0.1, basic * 0.5))

    # Old Regime
    deductions_old = 50000 + sec80c + sec80d + nps + home_loan + hra_exempt
    taxable_old = max(0.0, gross - deductions_old)

    def old_tax(t):
        if t <= 250000: return 0
        if t <= 500000: tax = (t - 250000) * 0.05
        elif t <= 1000000: tax = 12500 + (t - 500000) * 0.20
        else: tax = 112500 + (t - 1000000) * 0.30
        if t <= 500000: tax = 0
        return max(0, tax)
        
    tax_old_final = round(old_tax(taxable_old) * 1.04)

    # New Regime
    def new_tax(t):
        slabs = [(300000,0),(600000,0.05),(900000,0.10),(1200000,0.15),(1500000,0.20),(float('inf'),0.30)]
        tax, prev = 0.0, 0
        for limit, rate in slabs:
            if t <= prev: break
            tax += (min(t, limit) - prev) * rate
            prev = limit
        if t <= 700000: tax = 0
        return max(0, tax)

    taxable_new = max(0.0, gross - 75000)
    tax_new_final = round(new_tax(taxable_new) * 1.04)
    
    recommended = "Old Regime" if tax_old_final < tax_new_final else "New Regime"
    
    result = {
        "gross_income": gross,
        "old_regime": {
            "total_deductions": deductions_old,
            "taxable_income": taxable_old,
            "tax_payable": tax_old_final,
        },
        "new_regime": {
            "taxable_income": taxable_new,
            "tax_payable": tax_new_final,
        },
        "recommended": recommended,
        "savings": abs(tax_old_final - tax_new_final),
        "missing_deductions": {
            "nps_unused": int(50000 - nps),
            "sec80c_unused": int(150000 - sec80c),
            "sec80d_unused": int(25000 - sec80d),
        }
    }
    
    return {"tax_computation": result}
