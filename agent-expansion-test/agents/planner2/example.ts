import { planTask } from "./planner2.js";

const prompt = `Goal: Add a data export feature
Context: Existing dashboard already has filters
Constraints: One engineer, one sprint
Deliverables: export button, CSV endpoint, docs`;

console.log(planTask(prompt));
