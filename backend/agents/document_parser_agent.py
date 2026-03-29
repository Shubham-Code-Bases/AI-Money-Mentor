from .state import AgentState
import logging

def document_parser_node(state: AgentState):
    """
    Extracts structured data from inputs (simulated OCR for PDF, or direct forms).
    For AI Hackathon, this simulates PyMuPDF + Tesseract extraction logic.
    """
    logging.info("Agent [Document Parser]: Processing raw input payload...")
    raw = state.get("raw_input", {})
    intent = state.get("intent", "UNKNOWN")
    
    parsed_data = {}
    if intent == "TAX_ANALYSIS":
        # Ensure all fields expected by Tax Wizard are parsed
        parsed_data = {
            "basic": float(raw.get("basic", 1200000)),
            "hra": float(raw.get("hra", 360000)),
            "special": float(raw.get("special", 480000)),
            "lta": float(raw.get("lta", 100000)),
            "sec80c": float(raw.get("sec80c", 100000)),
            "sec80d": float(raw.get("sec80d", 15000)),
            "nps": float(raw.get("nps", 0)),
            "home_loan": float(raw.get("home_loan", 0)),
            "rent_paid": float(raw.get("rent_paid", 180000))
        }
    elif intent == "MF_PORTFOLIO_XRAY":
        # Ensure CAMS parsing structure
        parsed_data = {
            "total_invested": raw.get("total_invested", 5300000),
            "current_value": raw.get("current_value", 7730000),
            "funds": raw.get("funds", [])
        }
    
    return {"parsed_data": parsed_data}
