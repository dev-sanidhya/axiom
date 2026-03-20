import fs from "fs/promises";
import path from "path";
import { AgentRegistryEntry, PersistedRunRecord, SavedAgentDefinition } from "./types";
import { getConfig } from "./config";

const AGENTS_DIRNAME = "agents";
const RUNS_DIRNAME = "runs";

function getStorageRoot(baseDir?: string): string {
  return baseDir ?? getConfig().storageDir ?? path.join(process.cwd(), ".agentos");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "agent";
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureProjectStorage(baseDir?: string): Promise<string> {
  const root = getStorageRoot(baseDir);
  await ensureDirectory(path.join(root, AGENTS_DIRNAME));
  await ensureDirectory(path.join(root, RUNS_DIRNAME));
  return root;
}

export function getAgentsDirectory(baseDir?: string): string {
  return path.join(getStorageRoot(baseDir), AGENTS_DIRNAME);
}

export function getRunsDirectory(baseDir?: string): string {
  return path.join(getStorageRoot(baseDir), RUNS_DIRNAME);
}

export async function saveAgent(
  definition: SavedAgentDefinition,
  baseDir?: string
): Promise<string> {
  await ensureProjectStorage(baseDir);
  const filePath = path.join(getAgentsDirectory(baseDir), `${definition.slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(definition, null, 2), "utf8");
  return filePath;
}

export async function loadAgentDefinition(
  idOrSlug: string,
  baseDir?: string
): Promise<SavedAgentDefinition | null> {
  const agentsDir = getAgentsDirectory(baseDir);
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const filePath = path.join(agentsDir, entry.name);
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as SavedAgentDefinition;
      if (parsed.id === idOrSlug || parsed.slug === idOrSlug || parsed.name === idOrSlug) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function listSavedAgentDefinitions(
  baseDir?: string
): Promise<SavedAgentDefinition[]> {
  const agentsDir = getAgentsDirectory(baseDir);
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const definitions: SavedAgentDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const filePath = path.join(agentsDir, entry.name);
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as SavedAgentDefinition;
      definitions.push(parsed);
    }

    return definitions.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function persistRunRecord(
  record: PersistedRunRecord,
  baseDir?: string
): Promise<string> {
  await ensureProjectStorage(baseDir);
  const filePath = path.join(getRunsDirectory(baseDir), `${record.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  return filePath;
}

export async function listRunRecords(baseDir?: string): Promise<PersistedRunRecord[]> {
  const runsDir = getRunsDirectory(baseDir);
  try {
    const entries = await fs.readdir(runsDir, { withFileTypes: true });
    const runs: PersistedRunRecord[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const filePath = path.join(runsDir, entry.name);
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as PersistedRunRecord;
      runs.push(parsed);
    }

    return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export async function loadRunRecord(
  id: string,
  baseDir?: string
): Promise<PersistedRunRecord | null> {
  const filePath = path.join(getRunsDirectory(baseDir), `${id}.json`);
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as PersistedRunRecord;
    return parsed;
  } catch {
    return null;
  }
}

export function toRegistryEntry(definition: SavedAgentDefinition): AgentRegistryEntry {
  const {
    id,
    slug,
    name,
    summary,
    description,
    category,
    tags,
    kind,
    allowedTools,
    outputShape,
  } = definition;

  return {
    id,
    slug,
    name,
    summary,
    description,
    category,
    tags,
    kind,
    allowedTools,
    outputShape,
  };
}
