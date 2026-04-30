export { configure } from "./config";

export {
  ResearchAgent,
  CodeReviewAgent,
  ContentWriter,
  DataAnalyst,
  CompetitorAnalyzer,
  EmailDrafter,
  SEOAuditor,
  BugTriager,
  PRDWriter,
  TechnicalSpecAgent,
  DocumentationAgent,
  ReleaseNotesAgent,
  TestPlanAgent,
  MeetingSummarizer,
  SalesProspector,
  ProposalWriter,
  CustomerSupportAgent,
  FinancialAnalyst,
  MarketSizingAgent,
  CustomerFeedbackSynthesizer,
  getBuiltInAgents,
  getBuiltInAgentById,
} from "./agents";

export {
  createAgent,
  createAgentFromDefinition,
  saveAgent,
  loadAgent,
  listSavedAgents,
  CustomAgent,
  FRIENDLY_TO_SDK_TOOLS,
  mapFriendlyToolsToSdk,
  mapSdkToolsToFriendly,
} from "./create-agent";
export type { AgentSpec } from "./create-agent";

export { Agent } from "./agent";

export {
  ensureProjectStorage,
  getAgentsDirectory,
  getRunsDirectory,
  listRunRecords,
  loadRunRecord,
  loadAgentDefinition,
  listSavedAgentDefinitions,
  slugify,
} from "./storage";

export { buildComposioMcpServer, buildComposioAllowedTools } from "./mcp";

export type {
  AgentTool,
  AgentConfig,
  AgentResult,
  RunOptions,
  ProgressEvent,
  ToolCallRecord,
  GlobalConfig,
  StreamEvent,
  AgentKind,
  AgentCategory,
  AgentMetadata,
  AgentRegistryEntry,
  SavedAgentDefinition,
  PersistedRunRecord,
  AuthMode,
} from "./types";
