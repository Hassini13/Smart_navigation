const fs = require("fs");

const file = "./server/services/hybridPartitioner.js";

let code = fs.readFileSync(file, "utf8");

fs.copyFileSync(file, file + ".backup");

if (!code.includes('console.time("HYBRID_TOTAL")')) {
  code = code.replace(
    'function detectPartitions(nodeIds, nodeCoords, edges, options = {}) {',
    'function detectPartitions(nodeIds, nodeCoords, edges, options = {}) {\n  console.time("HYBRID_TOTAL");'
  );
}

if (!code.includes('console.time("SEED_SELECTION")')) {
  code = code.replace(
    'const orderedByDegree = [...nodeIds].sort(',
    'console.time("SEED_SELECTION");\n\n  const orderedByDegree = [...nodeIds].sort('
  );
}

if (!code.includes('console.timeEnd("SEED_SELECTION")')) {
  code = code.replace(
    'const partitions = seeds.map(() => new Set());',
    'console.timeEnd("SEED_SELECTION");\n  console.log("Seeds selected:", seeds.length);\n  console.time("BEST_FIRST_GROWTH");\n\n  const partitions = seeds.map(() => new Set());'
  );
}

if (!code.includes('console.timeEnd("BEST_FIRST_GROWTH")')) {
  code = code.replace(
    'function bestConnectedPartition(nodeId, sizeLimit) {',
    'console.timeEnd("BEST_FIRST_GROWTH");\n  console.log("Assigned after best-first growth:", assigned.size, "/", nodeIds.length);\n  console.time("LEFTOVER_ASSIGNMENT");\n\n  function bestConnectedPartition(nodeId, sizeLimit) {'
  );
}

if (!code.includes('console.timeEnd("LEFTOVER_ASSIGNMENT")')) {
  code = code.replace(
    'const stillUnassigned = nodeIds.filter(id => !assigned.has(id));',
    'console.timeEnd("LEFTOVER_ASSIGNMENT");\n  console.log("Still unassigned after cleanup:", nodeIds.filter(id => !assigned.has(id)).length);\n\n  const stillUnassigned = nodeIds.filter(id => !assigned.has(id));'
  );
}

if (!code.includes('console.timeEnd("HYBRID_TOTAL")')) {
  code = code.replace(
    '  return {\n    nodePartition,\n    partitions: partitionInfo,\n    metrics,\n  };',
    '  console.timeEnd("HYBRID_TOTAL");\n\n  return {\n    nodePartition,\n    partitions: partitionInfo,\n    metrics,\n  };'
  );
}

fs.writeFileSync(file, code, "utf8");

console.log("========================================");
console.log("hybridPartitioner.js modified successfully!");
console.log("Backup: hybridPartitioner.js.backup");
console.log("========================================");
