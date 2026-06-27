import { AGENT_REGISTRY } from "./contracts";
import type { AgentId, AgentInventoryItem, AgentRegistryEntry } from "./types";

export function listAgentRegistry(): readonly AgentRegistryEntry[] {
  return AGENT_REGISTRY;
}

export function listAgentInventory(): AgentInventoryItem[] {
  return AGENT_REGISTRY.map((entry) => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    modelRole: entry.modelRole,
    version: entry.skill.version,
    goal: entry.skill.goal,
  }));
}

export function getAgentRegistryEntry(id: AgentId): AgentRegistryEntry {
  const entry = AGENT_REGISTRY.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Unknown agent id: ${id}`);
  }
  return entry;
}
