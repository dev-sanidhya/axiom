export { ResearchAgent } from "./research";
export { CodeReviewAgent } from "./code-review";
export { ContentWriter } from "./content-writer";
export { DataAnalyst } from "./data-analyst";
export { CompetitorAnalyzer } from "./competitor-analyzer";
export { EmailDrafter } from "./email-drafter";
export { SEOAuditor } from "./seo-auditor";
export { BugTriager } from "./bug-triager";
export { PRDWriter } from "./prd-writer";
export { TechnicalSpecAgent } from "./technical-spec-agent";
export { DocumentationAgent } from "./documentation-agent";
export { ReleaseNotesAgent } from "./release-notes-agent";
export { TestPlanAgent } from "./test-plan-agent";
export { MeetingSummarizer } from "./meeting-summarizer";
export { SalesProspector } from "./sales-prospector";
export { ProposalWriter } from "./proposal-writer";
export { CustomerSupportAgent } from "./customer-support-agent";
export { FinancialAnalyst } from "./financial-analyst";
export { MarketSizingAgent } from "./market-sizing-agent";
export { CustomerFeedbackSynthesizer } from "./customer-feedback-synthesizer";

import { BugTriager } from "./bug-triager";
import { CodeReviewAgent } from "./code-review";
import { CompetitorAnalyzer } from "./competitor-analyzer";
import { ContentWriter } from "./content-writer";
import { CustomerFeedbackSynthesizer } from "./customer-feedback-synthesizer";
import { CustomerSupportAgent } from "./customer-support-agent";
import { DataAnalyst } from "./data-analyst";
import { DocumentationAgent } from "./documentation-agent";
import { EmailDrafter } from "./email-drafter";
import { FinancialAnalyst } from "./financial-analyst";
import { MarketSizingAgent } from "./market-sizing-agent";
import { MeetingSummarizer } from "./meeting-summarizer";
import { PRDWriter } from "./prd-writer";
import { ProposalWriter } from "./proposal-writer";
import { ReleaseNotesAgent } from "./release-notes-agent";
import { ResearchAgent } from "./research";
import { SEOAuditor } from "./seo-auditor";
import { SalesProspector } from "./sales-prospector";
import { TechnicalSpecAgent } from "./technical-spec-agent";
import { TestPlanAgent } from "./test-plan-agent";

const BUILT_IN_AGENTS = [
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
] as const;

export function getBuiltInAgents() {
  return BUILT_IN_AGENTS.map((agent) => agent.definition);
}

export function getBuiltInAgentById(idOrSlug: string) {
  return BUILT_IN_AGENTS.find(
    (agent) =>
      agent.definition.id === idOrSlug ||
      agent.definition.slug === idOrSlug ||
      agent.definition.name.toLowerCase() === idOrSlug.toLowerCase()
  );
}
