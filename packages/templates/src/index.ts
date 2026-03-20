// Agents
export { default as researchAgent } from './agents/research-agent';
export { default as codeReviewAgent } from './agents/code-review-agent';
export { default as dataAnalysisAgent } from './agents/data-analysis-agent';
export { default as taskPlannerAgent } from './agents/task-planner-agent';
export { default as documentationAgent } from './agents/documentation-agent';

// Tools - Web
export { webSearchTool, webScrapeTool, httpRequestTool } from './tools/web-tools';

// Tools - File System
export {
  readFileTool,
  writeFileTool,
  listFilesTool,
  fileStatsTool,
} from './tools/file-tools';

// Agent registry for easy access
export const allAgents = {
  'research-agent': () => import('./agents/research-agent').then(m => m.default),
  'code-review-agent': () => import('./agents/code-review-agent').then(m => m.default),
  'data-analysis-agent': () => import('./agents/data-analysis-agent').then(m => m.default),
  'task-planner-agent': () => import('./agents/task-planner-agent').then(m => m.default),
  'documentation-agent': () => import('./agents/documentation-agent').then(m => m.default),
};

// Tool registry
export const allTools = [
  'web-search',
  'web-scrape',
  'http-request',
  'read-file',
  'write-file',
  'list-files',
  'file-stats',
];
