import logging
from typing import Literal
from langgraph.graph import StateGraph, START, END

from .state import AgentState
from .document_parser_agent import document_parser_node
from .tax_computation_agent import tax_computation_node
from .portfolio_analytics_agent import portfolio_analytics_node
from .recommendation_agent import recommendation_node
from .compliance_guard_agent import compliance_guard_node

def route_intent(state: AgentState) -> Literal["tax_computation_agent", "portfolio_analytics_agent", "fallback"]:
    intent = state.get("intent", "UNKNOWN")
    logging.info(f"Supervisor conditionally routing intent: {intent}")
    if intent == "TAX_ANALYSIS":
        return "tax_computation_agent"
    elif intent == "MF_PORTFOLIO_XRAY":
        return "portfolio_analytics_agent"
    return "fallback"

def fallback_node(state: AgentState):
    """If intent is unknown, dump directly to END"""
    logging.warning("Unknown intent, bypassing core financial pipelines.")
    return {"final_output": {"status": "error", "message": "Unknown workflow intent"}}

def build_graph():
    builder = StateGraph(AgentState)
    
    # 1. Register all nodes
    builder.add_node("document_parser", document_parser_node)
    builder.add_node("tax_computation_agent", tax_computation_node)
    builder.add_node("portfolio_analytics_agent", portfolio_analytics_node)
    builder.add_node("recommendation_agent", recommendation_node)
    builder.add_node("compliance_guard_agent", compliance_guard_node)
    builder.add_node("fallback", fallback_node)
    
    # 2. Define standard flow
    builder.add_edge(START, "document_parser")
    
    # 3. Conditional routing from document parser
    builder.add_conditional_edges("document_parser", route_intent)
    
    # 4. Collapse computed branches back to recommendation core
    builder.add_edge("tax_computation_agent", "recommendation_agent")
    builder.add_edge("portfolio_analytics_agent", "recommendation_agent")
    
    # 5. Final guardrails
    builder.add_edge("recommendation_agent", "compliance_guard_agent")
    builder.add_edge("compliance_guard_agent", END)
    builder.add_edge("fallback", END)
    
    return builder.compile()

app_graph = build_graph()
