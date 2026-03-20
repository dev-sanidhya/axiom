import { AgentConfig } from '@agent-platform/core';

export const config: AgentConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4',
  temperature: 0.7,
  maxTokens: 4000,
};

export default config;
