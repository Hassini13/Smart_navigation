const fs = require("fs");

const file = "./server/services/hybridPartitioner.js";

let code = fs.readFileSync(file, "utf8");

// Backup original file
fs.copyFileSync(file, file + ".backup");

// 1. Total timer
if (!code.includes('console.time("HYBRID_TOTAL")')) {
  code = code.replace(
    'function detectPartitions(nodeIds, nodeCoords, edges, options = {}) {',
    'function detectPartitions(nodeIds, nodeCoords, edges, options = {}) {\n  console.time("HYBRID_TOTAL");'
  );
}

// 2. Seed selection timer
if (!code.includes('console.time("SEED_SELECTION")')) {
  code = code.replace(
    'const orderedByDegree = [...nodeIds].sort(',
    'console.time("SEED_SELECTION");\n\n  const orderedByDegree = [...nodeIds].sort('
  );
}

// 3. End seed selection + start Best-First Growth
if (!code.includes('console.timeEnd("SEED_SELECTION")')) {
  code = code.replace(
    'const partitions = seeds.map(() => new Set());',
    `console.timeEnd("SEED_SELECTION");
  console.log("Seeds selected:", seeds.length);
  console.time("BEST_FIRST_GROWTH");

  const partitions = seeds.map(() => new Set());`
  );
}

// 4. End Best-First Growth + start leftover timing
if (!code.includes('console.timeEnd("BEST_FIRST_GROWTH")')) {
  code = code.replace(
    'function bestConnectedPartition(nodeId, sizeLimit) {',
    `console.timeEnd("BEST_FIRST_GROWTH");
  console.log(
    "Assigned after best-first growth:",
    assigned.size,
    "/",
    nodeIds.length
  );
  console.time("LEFTOVER_ASSIGNMENT");

  function bestConnectedPartition(nodeId, sizeLimit) {`
  );
}

// 5. End leftover timing
if (!code.includes('console.timeEnd("LEFTOVER_ASSIGNMENT")')) {
  code = code.replace(
    'const stillUnassigned = nodeIds.filter(id => !assigned.has(id));',
    `console.timeEnd("LEFTOVER_ASSIGNMENT");
  console.log(
    "Still unassigned after cleanup:",
    nodeIds.filter(id => !assigned.has(id)).length
  );

  const stillUnassigned = nodeIds.filter(id => !assigned.has(id));`
  );
}

// 6. End total timing
if (!code.includes('console.timeEnd("HYBRID_TOTAL")')) {
  code = code.replace(
    '  return {\n    nodePartition,\n    partitions: partitionInfo,\n    metrics,\n  };',
    `  console.timeEnd("HYBRID_TOTAL");

  return {
    nodePartition,
    partitions: partitionInfo,
    metrics,
  };`
  );
}

fs.writeFileSync(file, code, "utf8");

console.log("");
console.log("========================================");
console.log("hybridPartitioner.js modified successfully!");
console.log("Original backup created:");
console.log("hybridPartitioner.js.backup");
console.log("========================================");
