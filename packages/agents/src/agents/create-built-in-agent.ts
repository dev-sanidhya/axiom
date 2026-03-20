import { Agent } from "../agent";
import { AgentCategory, AgentRegistryEntry, AgentResult, RunOptions } from "../types";
import { slugify } from "../storage";

export interface BuiltInAgentDefinition {
  id: string;
  name: string;
  summary: string;
  description?: string;
  category: AgentCategory;
  tags: string[];
  allowedTools: string[];
  outputShape?: string;
  instructions: string;
  maxLoops?: number;
  temperature?: number;
}

export interface BuiltInAgent {
  definition: AgentRegistryEntry;
  run(input: string, options?: RunOptions): Promise<AgentResult>;
}

export function createBuiltInAgent(
  definition: BuiltInAgentDefinition
): BuiltInAgent {
  const registryEntry: AgentRegistryEntry = {
    id: definition.id,
    slug: slugify(definition.id),
    name: definition.name,
    summary: definition.summary,
    description: definition.description,
    category: definition.category,
    tags: definition.tags,
    kind: "built_in",
    allowedTools: definition.allowedTools,
    outputShape: definition.outputShape,
  };

  const agent = new Agent({
    instructions: definition.instructions,
    allowedTools: definition.allowedTools,
    maxLoops: definition.maxLoops,
    temperature: definition.temperature,
    metadata: registryEntry,
  });

  return {
    definition: registryEntry,
    run(input: string, options?: RunOptions): Promise<AgentResult> {
      return agent.run(input, options);
    },
  };
}
