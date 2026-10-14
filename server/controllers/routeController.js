const { getGraph } = require("../services/graphEngine");

const getMap = async (req, res) => {
  try {
    const graph = await getGraph();

    res.json({
      success: true,
      data: graph.serialize(),
    });
  } catch (error) {
    console.error("Map error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};


const findRoute = async (req, res) => {
  try {
    const graph = await getGraph();

    const {
      source,
      destination,
      destinationTypes,
    } = req.body;


    // Check source
    if (!source) {
      return res.status(400).json({
        error: "source required",
      });
    }


    // Check source exists
    if (!graph.nodes.has(source)) {
      return res.status(404).json({
        error: `Node '${source}' not found`,
      });
    }


    let targetId = destination;


    // If destinationTypes are provided
    if (!destination && destinationTypes?.length) {
      const bestResult =
        graph.findBestDestination(
          source,
          destinationTypes
        );

      if (!bestResult) {
        return res.status(404).json({
          error: "No reachable destination found",
        });
      }

      const full = graph.dijkstraFull(
        source,
        bestResult.destinationId
      );

      return res.json(
        buildResponse(
          graph,
          source,
          bestResult.destinationId,
          bestResult,
          full
        )
      );
    }


    // Check destination
    if (!targetId) {
      return res.status(400).json({
        error:
          "destination or destinationTypes required",
      });
    }


    // Check destination exists
    if (!graph.nodes.has(targetId)) {
      return res.status(404).json({
        error: `Node '${targetId}' not found`,
      });
    }


    // Source and destination cannot be same
    if (source === targetId) {
      return res.status(400).json({
        error:
          "source and destination are the same",
      });
    }


    // Try partition-aware Dijkstra
    const partitioned =
      graph.dijkstraPartitioned(
        source,
        targetId
      );


    // Always calculate normal full Dijkstra
    const full =
      graph.dijkstraFull(
        source,
        targetId
      );


    /*
      IMPORTANT:

      If partitioned Dijkstra fails but
      normal Dijkstra succeeds, use the
      normal Dijkstra route.

      This prevents "No path found"
      when the partition boundaries
      prevent the partitioned algorithm
      from finding an otherwise valid path.
    */

    const finalRoute =
      partitioned || full;


    // No route found by either algorithm
    if (!finalRoute) {
      return res.status(404).json({
        error: "No path found",
      });
    }


    // Send response
    res.json(
      buildResponse(
        graph,
        source,
        targetId,
        finalRoute,
        full
      )
    );

  } catch (error) {
    console.error(
      "Route error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
};


const buildResponse = (
  graph,
  source,
  target,
  partitioned,
  full
) => {

  const srcNode =
    graph.nodes.get(source);

  const tgtNode =
    graph.nodes.get(target);


  const partitionsTraversed = [
    ...new Set(
      partitioned.path.map(
        id =>
          graph.nodes.get(id).partition
      )
    ),
  ];


  const avgSpeed = 40;


  const distKm =
    partitioned.totalWeight / 1000;


  const etaMin = Math.round(
    (distKm / avgSpeed) * 60
  );


  const partitionVisited =
    Array.isArray(
      partitioned.visitedNodes
    )
      ? partitioned.visitedNodes.length
      : Number(
          partitioned.visitedNodes
        );


  const fullVisited = full
    ? Array.isArray(
        full.visitedNodes
      )
      ? full.visitedNodes.length
      : Number(
          full.visitedNodes
        )
    : 0;


  const improvement =
    fullVisited > 0
      ? Math.round(
          (
            (fullVisited -
              partitionVisited) /
            fullVisited
          ) * 100
        )
      : 0;


  /*
    Route-quality honesty check.

    partitioned/finalRoute may be the actual partition-restricted result,
    or (if that search failed) the full Dijkstra result used as a
    fallback. Either way, compare its cost against the always-computed
    full-graph baseline and surface the difference instead of hiding it -
    per the project's "don't sacrifice route quality silently" rule.
  */

  const routeCostDelta =
    full
      ? partitioned.totalWeight -
        full.totalWeight
      : 0;

  const routeCostDeltaPct =
    full && full.totalWeight > 0
      ? Math.round(
          (routeCostDelta /
            full.totalWeight) *
            10000
        ) / 100
      : 0;


  return {
    success: true,

    data: {

      source: {
        id: source,
        label:
          srcNode.label || source,
        partition:
          srcNode.partition,
      },


      destination: {
        id: target,
        label:
          tgtNode.label || target,
        partition:
          tgtNode.partition,
      },


      path:
        partitioned.path,


      pathLabels:
        partitioned.path.map(
          id =>
            graph.nodes.get(id)
              .label || id
        ),


      edges:
        partitioned.edges,


      totalWeight:
        partitioned.totalWeight,


      distanceKm:
        parseFloat(
          distKm.toFixed(2)
        ),


      etaMinutes:
        etaMin,


      execMs:
        parseFloat(
          partitioned.execMs.toFixed(4)
        ),


      visitedNodes:
        partitioned.visitedNodes,


      partitionsTraversed:
        partitionsTraversed,


      // How many partitions the partition-aware search actually had to
      // open up (corridor + any expansion layers) before it found a
      // route, straight from graphEngine.dijkstraPartitioned.
      partitionsInvolved:
        partitioned.partitionCount ??
        null,


      // Positive means the partition-restricted route cost more than the
      // full-graph baseline (a real trade-off); 0 means they matched.
      // Reported honestly rather than only showing the cases where
      // partitioning wins.
      routeCostDelta,

      routeCostDeltaPct,


      algorithmUsed:
        partitioned === full
          ? "Full Dijkstra"
          : "Partition-Aware Dijkstra (Hybrid Partitioning)",


      comparison: {

        withPartition: {
          visitedNodes:
            partitionVisited,

          execMs:
            parseFloat(
              partitioned.execMs.toFixed(4)
            ),

          searchSpace:
            partitionVisited,
        },


        withoutPartition: {

          visitedNodes:
            fullVisited,

          execMs: full
            ? parseFloat(
                full.execMs.toFixed(4)
              )
            : 0,

          searchSpace:
            fullVisited,
        },


        improvementPct:
          improvement,
      },


      totalNodes:
        graph.nodes.size,


      memoryUsedKB:
        Math.round(
          process.memoryUsage()
            .heapUsed / 1024
        ),
    },
  };
};


const getLocations = async (
  req,
  res
) => {
  try {

    const pool =
      require("../services/database");


    const [locations] =
      await pool.query(`
        SELECT
          id,
          name,
          type,
          latitude,
          longitude
        FROM named_locations
        ORDER BY name
      `);


    res.json({
      success: true,
      data: locations,
    });

  } catch (error) {

    console.error(
      "GET LOCATIONS ERROR:",
      error
    );


    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


const getStats = async (
  req,
  res
) => {
  try {

    const graph =
      await getGraph();


    const nodes = [
      ...graph.nodes.values(),
    ];


    const partitionSizes = {};


    for (const n of nodes) {

      partitionSizes[n.partition] =
        (partitionSizes[n.partition] ||
          0) + 1;
    }


    res.json({

      success: true,

      data: {

        totalNodes:
          nodes.length,


        partitions:
          Object.keys(
            graph.partitions
          ).map(k => ({

            ...graph.partitions[k],

            nodeCount:
              partitionSizes[k] ||
              0,
          })),


        // Hybrid partitioning quality metrics (balance, cross-partition
        // edges, weights used) - see hybridPartitioner.computePartitionMetrics.
        // Added alongside the existing fields above rather than replacing
        // them, so older clients reading `partitions`/`totalNodes` still work.
        partitionMetrics:
          graph.partitionMetrics,


        memoryUsedKB:
          Math.round(
            process.memoryUsage()
              .heapUsed / 1024
          ),
      },
    });

  } catch (error) {

    console.error(
      "Stats error:",
      error
    );


    res.status(500).json({
      error: error.message,
    });
  }
};


module.exports = {
  getMap,
  findRoute,
  getLocations,
  getStats,
};