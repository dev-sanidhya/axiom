import { AgentDefinition, AgentContext } from '@agent-platform/core';

const exampleAgent: AgentDefinition = {
  name: 'example-agent',
  version: '0.1.0',
  description: 'An example agent to get you started',

  systemPrompt: `You are a helpful AI assistant.
You help users with their tasks in a clear and concise manner.`,

  tools: [],

  config: {
    model: 'claude-sonnet-4',
    provider: 'anthropic',
    temperature: 0.7,
    maxTokens: 4000,
  },

  async execute(input: string, context: AgentContext): Promise<string> {
    // This is where your agent logic goes
    // For now, it just echoes back the input

    context.emit?.('agent:thinking', { message: 'Processing input...' });

    return `You said: ${input}`;
  },
};

export default exampleAgent;
