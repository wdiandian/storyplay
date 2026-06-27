const moduleUrl = new URL("../lib/engine/agent-system/index.ts", import.meta.url).href;
const { listAgentInventory } = await import(moduleUrl);

const inventory = listAgentInventory();

console.log("| Agent | Kind | Model Role | Version | Goal |");
console.log("| --- | --- | --- | --- | --- |");
for (const item of inventory) {
  console.log(
    `| ${item.name} | ${item.kind} | ${item.modelRole} | ${item.version} | ${item.goal.replace(/\|/g, "/")} |`,
  );
}
