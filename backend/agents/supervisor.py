from langgraph.graph import StateGraph, START, END
from .state import AgentState
from .profile_agent import profile_node
from .scanner_agent import scanner_node
from .opportunity_agent import opportunity_node
from .verification_agent import verification_node

def build_graph():
    builder = StateGraph(AgentState)
    
    # Adding nodes
    builder.add_node("profile_agent", profile_node)
    builder.add_node("scanner_agent", scanner_node)
    builder.add_node("opportunity_agent", opportunity_node)
    builder.add_node("verification_agent", verification_node)

    # Edge logic
    builder.add_edge(START, "profile_agent")
    builder.add_edge("profile_agent", "scanner_agent")
    builder.add_edge("scanner_agent", "opportunity_agent")
    builder.add_edge("opportunity_agent", "verification_agent")
    builder.add_edge("verification_agent", END)

    return builder.compile()

app_graph = build_graph()
