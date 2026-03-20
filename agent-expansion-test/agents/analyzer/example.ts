import { analyze } from "./analyzer.js";

const sample = `month,revenue,region
Jan,1200,North
Feb,1450,North
Mar,,South
Apr,1100,West`;

const report = await analyze(sample);
console.log(report);
