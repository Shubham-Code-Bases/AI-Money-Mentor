from typing import TypedDict, List, Dict, Any, Optional
import operator
from typing import Annotated

class AgentState(TypedDict, total=False):
    # Core Context
    session_id: str
    intent: str  # "TAX_ANALYSIS" or "MF_PORTFOLIO_XRAY"
    
    # Profile Data (from user_sessions)
    profile: Dict[str, Any]
    
    # Document Input / Raw Payload
    raw_input: Dict[str, Any]
    
    # Parsed Data Payload (DocumentParser output)
    parsed_data: Dict[str, Any]
    
    # Computation Results
    tax_computation: Dict[str, Any]
    portfolio_analytics: Dict[str, Any]
    
    # Generated Outputs
    recommendations: str
    compliance_flags: List[str]
    final_disclaimer: str
    
    # Final structured response to send to client
    final_output: Dict[str, Any]
