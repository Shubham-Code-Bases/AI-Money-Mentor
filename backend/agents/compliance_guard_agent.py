from .state import AgentState
import logging

def compliance_guard_node(state: AgentState):
    """
    The final safety check in the pipeline.
    Validates output against guardrails: no direct stock-picking advice,
    mandates SEBI / educational disclaimers.
    Forms the final output schema for the client.
    """
    logging.info("Agent [Compliance Guard]: Validating output and adding disclaimers...")
    
    rec_text = state.get("recommendations", "")
    flags = []
    
    # Simple heuristic to flag specific stock-picking vocabulary boundaries
    if "buy HDFC" in rec_text or "sell Reliance" in rec_text:
         flags.append("FLAG: Specific equity recommendation detected out of mandate.")
         rec_text += "\n\n**System Note**: Parts of the above have been flagged by the compliance guard."
         
    disclaimer = "⚠️ AI-MoneyMentor provides AI-generated insights for educational purposes only. This system is not a SEBI-registered advisor. Consult a certified financial planner before making investment decisions."
    
    # Bundle everything into a final output struct
    intent = state.get("intent", "UNKNOWN")
    final_output = {
        "status": "success",
        "intent": intent,
        "recommendations": rec_text,
        "disclaimer": disclaimer,
        "compliance_flags": flags
    }
    
    # Include numeric contexts
    if intent == "TAX_ANALYSIS":
         final_output.update(state.get("tax_computation", {}))
    elif intent == "MF_PORTFOLIO_XRAY":
         final_output.update(state.get("portfolio_analytics", {}))
         
    return {
        "final_output": final_output,
        "final_disclaimer": disclaimer,
        "compliance_flags": flags
    }
