# {{AgentName}} - Raw Python Task Planner Agent

Builds a clear execution plan from a goal statement. It is useful for feature work, milestones, and implementation checklists.

## Quick start

```bash
python example.py
```

```python
from {{agent_name}} import plan_task

goal = """Goal: Launch a docs site
Constraints: one week, no backend changes
Deliverables: landing page, setup guide, examples"""

print(plan_task(goal))
```
