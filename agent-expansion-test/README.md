# agent-expansion-test

An AI Agent project built with Agent Platform.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your API keys in `.env`:
```bash
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

3. Run the dev server:
```bash
agent dev
```

4. Run your agent:
```bash
agent run example
```

## Project Structure

```
agent-expansion-test/
├── agents/          # Your agent definitions
├── tools/           # Custom tools for agents
├── agent.config.ts  # Agent configuration
└── .env            # Environment variables
```

## Available Commands

- `agent dev` - Start development server with UI
- `agent run <agent-name>` - Run an agent
- `agent test` - Run agent tests
- `agent add <template>` - Add agent from template

## Learn More

- [Documentation](https://agent-platform.dev/docs)
- [Examples](https://agent-platform.dev/examples)
- [Community](https://agent-platform.dev/community)
