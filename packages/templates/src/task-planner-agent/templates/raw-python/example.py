from {{agent_name}} import plan_task

prompt = """Goal: Add a data export feature
Context: Existing dashboard already has filters
Constraints: One engineer, one sprint
Deliverables: export button, CSV endpoint, docs"""

if __name__ == "__main__":
    print(plan_task(prompt))
