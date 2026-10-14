const pool = require("./database");
const { detectPartitions } = require("./hybridPartitioner");


/* =========================================================
   MIN HEAP
   ========================================================= */

class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this._up(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;

    const root = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._down(0);
    }

    return root;
  }

  get size() {
    return this.heap.length;
  }

  _up(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);

      if (this.heap[parent].d <= this.heap[i].d) {
        break;
      }

      [this.heap[parent], this.heap[i]] =
        [this.heap[i], this.heap[parent]];

      i = parent;
    }
  }

  _down(i) {
    const length = this.heap.length;

    while (true) {
      let smallest = i;

      const left = i * 2 + 1;
      const right = i * 2 + 2;

      if (
        left < length &&
        this.heap[left].d <
          this.heap[smallest].d
      ) {
        smallest = left;
      }

      if (
        right < length &&
        this.heap[right].d <
          this.heap[smallest].d
      ) {
        smallest = right;
      }

      if (smallest === i) {
        break;
      }

      [this.heap[i], this.heap[smallest]] =
        [this.heap[smallest], this.heap[i]];

      i = smallest;
    }
  }
}


/* =========================================================
   GRAPH
   ========================================================= */

class Graph {

  constructor(nodes, edges, partitionOptions) {

    this.nodes = new Map();
    this.adj = new Map();

    this.partitionMap = new Map();
    this.partitions = {};
    this.partitionMetrics = null;

    this.partitionAdj = new Map();

    this._build(nodes, edges, partitionOptions);
  }


  /* =======================================================
     BUILD
     ======================================================= */

  _build(NODES, EDGES, partitionOptions) {

    console.log(
      "Starting hybrid (topology + geography + traffic) partitioning..."
    );

    const nodeIds =
      NODES.map(n => n.id);

    // Hybrid partitioning needs coordinates for the geography term.
    // Built once here so the partitioner doesn't have to re-derive it.
    const nodeCoords = new Map();

    for (const n of NODES) {
      const lat = Number(n.latitude);
      const lon = Number(n.longitude);

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        nodeCoords.set(n.id, { lat, lon });
      }
    }

    const {
      nodePartition,
      partitions,
      metrics
    } = detectPartitions(
      nodeIds,
      nodeCoords,
      EDGES,
      partitionOptions
    );

    this.partitions =
      partitions;

    this.partitionMetrics =
      metrics;


    for (const n of NODES) {

      const partition =
        nodePartition.get(n.id);

      const node =
        {
          ...n,
          partition
        };

      this.nodes.set(
        n.id,
        node
      );

      this.adj.set(
        n.id,
        []
      );


      if (
        !this.partitionMap.has(
          partition
        )
      ) {
        this.partitionMap.set(
          partition,
          new Set()
        );
      }

      this.partitionMap
        .get(partition)
        .add(n.id);
    }


    /* -----------------------------------------------------
       Build road adjacency
       ----------------------------------------------------- */

    for (const e of EDGES) {

      const edge = {

        id: e.id,

        from:
          e.from_node,

        to:
          e.to_node,

        distance:
          Number(e.distance),

        trafficLevel: 1
      };


      const weight =
        this._weight(edge);


      const forward = {
        ...edge,
        weight
      };


      const reverse = {

        ...edge,

        from:
          edge.to,

        to:
          edge.from,

        weight
      };


      if (
        this.adj.has(
          edge.from
        )
      ) {

        this.adj
          .get(edge.from)
          .push(forward);
      }


      if (
        this.adj.has(
          edge.to
        )
      ) {

        this.adj
          .get(edge.to)
          .push(reverse);
      }
    }


    this._buildPartitionGraph();


    console.log(
      `Created ${this.partitionMap.size} automatic partitions`
    );
  }


  /* =======================================================
     WEIGHT
     ======================================================= */

  _weight(edge) {

    const trafficMultiplier =
      1 +
      (edge.trafficLevel - 1) *
        0.15;

    return Math.round(
      edge.distance *
        trafficMultiplier
    );
  }


  /* =======================================================
     PARTITION GRAPH
     ======================================================= */

  _buildPartitionGraph() {

    for (
      const partitionId
      of this.partitionMap.keys()
    ) {

      this.partitionAdj.set(
        partitionId,
        new Set()
      );
    }


    for (
      const [nodeId, adjacency]
      of this.adj
    ) {

      const current =
        this.nodes.get(nodeId);

      if (!current) continue;

      const currentPartition =
        current.partition;


      for (
        const edge
        of adjacency
      ) {

        const next =
          this.nodes.get(
            edge.to
          );

        if (!next) continue;


        const nextPartition =
          next.partition;


        if (
          currentPartition ===
          nextPartition
        ) {
          continue;
        }


        this.partitionAdj
          .get(currentPartition)
          ?.add(nextPartition);
      }
    }
  }


  /* =======================================================
     PARTITION CORRIDOR
     ======================================================= */

  _partitionPath(
    sourcePartition,
    targetPartition
  ) {

    if (
      sourcePartition ===
      targetPartition
    ) {

      return [
        sourcePartition
      ];
    }


    const visited =
      new Set([
        sourcePartition
      ]);


    const queue = [
      {
        partition:
          sourcePartition,

        path: [
          sourcePartition
        ]
      }
    ];


    let index = 0;


    while (
      index <
      queue.length
    ) {

      const current =
        queue[index++];


      const neighbors =
        this.partitionAdj.get(
          current.partition
        ) || new Set();


      for (
        const next
        of neighbors
      ) {

        if (
          visited.has(next)
        ) {
          continue;
        }


        const path = [
          ...current.path,
          next
        ];


        if (
          next ===
          targetPartition
        ) {

          return path;
        }


        visited.add(next);


        queue.push({
          partition: next,
          path
        });
      }
    }


    return null;
  }


  /* =======================================================
     EXPAND PARTITION CORRIDOR
     ======================================================= */

  _expandPartitions(
    basePartitions,
    layers
  ) {

    const result =
      new Set(
        basePartitions
      );


    let frontier =
      new Set(
        basePartitions
      );


    for (
      let layer = 0;
      layer < layers;
      layer++
    ) {

      const nextFrontier =
        new Set();


      for (
        const partitionId
        of frontier
      ) {

        const neighbors =
          this.partitionAdj.get(
            partitionId
          ) || new Set();


        for (
          const neighbor
          of neighbors
        ) {

          if (
            result.has(neighbor)
          ) {
            continue;
          }


          result.add(
            neighbor
          );


          nextFrontier.add(
            neighbor
          );
        }
      }


      frontier =
        nextFrontier;


      if (
        frontier.size === 0
      ) {
        break;
      }
    }


    return result;
  }


  /* =======================================================
     FULL DIJKSTRA
     ======================================================= */

  dijkstraFull(
    sourceId,
    targetId
  ) {

    return this._dijkstra(
      sourceId,
      targetId,
      null
    );
  }


  /* =======================================================
     PARTITION-AWARE DIJKSTRA
     ======================================================= */

  dijkstraPartitioned(
    sourceId,
    targetId
  ) {

    const sourceNode =
      this.nodes.get(
        sourceId
      );

    const targetNode =
      this.nodes.get(
        targetId
      );


    if (
      !sourceNode ||
      !targetNode
    ) {

      return null;
    }


    const sourcePartition =
      sourceNode.partition;

    const targetPartition =
      targetNode.partition;


    if (
      sourcePartition ===
      undefined ||
      targetPartition ===
      undefined
    ) {

      return null;
    }


    const corridor =
      this._partitionPath(
        sourcePartition,
        targetPartition
      );


    if (!corridor) {
      return null;
    }


    /*
     * Try the smallest search space first.
     */

    let result =
      this._dijkstra(
        sourceId,
        targetId,
        new Set(corridor)
      );


    if (result) {

      result.partitionCount =
        corridor.length;

      result.partitionLayers =
        0;

      return result;
    }


    /*
     * If the strict corridor cannot connect the
     * actual road nodes, expand gradually.
     *
     * This prevents unnecessary Full Dijkstra.
     */

    for (
      let layers = 1;
      layers <= 3;
      layers++
    ) {

      const expanded =
        this._expandPartitions(
          corridor,
          layers
        );


      result =
        this._dijkstra(
          sourceId,
          targetId,
          expanded
        );


      if (result) {

        result.partitionCount =
          expanded.size;

        result.partitionLayers =
          layers;

        return result;
      }
    }


    /*
     * Partition-aware search failed even
     * after controlled expansion.
     */

    return null;
  }


  /* =======================================================
     DIJKSTRA
     * ======================================================= */

  _dijkstra(
    sourceId,
    targetId,
    allowedPartitions
  ) {

    const startTime =
      process.hrtime.bigint();


    const dist =
      new Map();

    const prev =
      new Map();

    const visited =
      new Set();

    const visitedNodes =
      [];


    /* -----------------------------------------------------
       Initialize only allowed nodes
       ----------------------------------------------------- */

    if (
      allowedPartitions
    ) {

      for (
        const partitionId
        of allowedPartitions
      ) {

        const partitionNodes =
          this.partitionMap.get(
            partitionId
          );


        if (!partitionNodes) {
          continue;
        }


        for (
          const nodeId
          of partitionNodes
        ) {

          dist.set(
            nodeId,
            Infinity
          );
        }
      }

    } else {

      for (
        const nodeId
        of this.nodes.keys()
      ) {

        dist.set(
          nodeId,
          Infinity
        );
      }
    }


    if (
      !dist.has(sourceId)
    ) {

      return null;
    }


    dist.set(
      sourceId,
      0
    );


    const pq =
      new MinHeap();


    pq.push({
      id: sourceId,
      d: 0
    });


    /* -----------------------------------------------------
       Dijkstra
       ----------------------------------------------------- */

    while (
      pq.size > 0
    ) {

      const current =
        pq.pop();


      if (!current) {
        break;
      }


      const u =
        current.id;


      if (
        visited.has(u)
      ) {
        continue;
      }


      visited.add(
        u
      );


      visitedNodes.push(
        u
      );


      if (
        u === targetId
      ) {

        break;
      }


      const currentDistance =
        dist.get(u);


      const adjacency =
        this.adj.get(u) || [];


      for (
        const edge
        of adjacency
      ) {

        const v =
          edge.to;


        if (
          visited.has(v)
        ) {
          continue;
        }


        /*
         * Partition restriction.
         */

        if (
          allowedPartitions
        ) {

          const node =
            this.nodes.get(v);


          if (
            !node ||
            !allowedPartitions.has(
              node.partition
            )
          ) {

            continue;
          }
        }


        const newDistance =
          currentDistance +
          edge.weight;


        const oldDistance =
          dist.get(v);


        if (
          oldDistance ===
            undefined ||
          newDistance <
            oldDistance
        ) {

          dist.set(
            v,
            newDistance
          );


          prev.set(
            v,
            {
              node: u,
              edge
            }
          );


          pq.push({
            id: v,
            d: newDistance
          });
        }
      }
    }


    const execNs =
      Number(
        process.hrtime.bigint() -
          startTime
      );


    const targetDistance =
      dist.get(
        targetId
      );


    if (
      targetDistance ===
        undefined ||
      targetDistance ===
        Infinity
    ) {

      return null;
    }


    /* -----------------------------------------------------
       Reconstruct path
       ----------------------------------------------------- */

    const path = [];

    let current =
      targetId;


    while (
      current !==
      undefined
    ) {

      path.unshift(
        current
      );


      current =
        prev.get(
          current
        )?.node;
    }


    if (
      path.length === 0 ||
      path[0] !== sourceId
    ) {

      return null;
    }


    const edges = [];


    for (
      let i = 0;
      i < path.length - 1;
      i++
    ) {

      const entry =
        prev.get(
          path[i + 1]
        );


      if (entry) {
        edges.push(
          entry.edge
        );
      }
    }


    return {

      path,

      edges,

      totalWeight:
        targetDistance,

      visitedNodes,

      execMs:
        execNs / 1e6
    };
  }


  /* =======================================================
     NODES BY TYPE
     ======================================================= */

  getNodesByType(type) {

    return [
      ...this.nodes.values()
    ].filter(
      n =>
        n.type === type
    );
  }


  /* =======================================================
     BEST DESTINATION
     ======================================================= */

  findBestDestination(
    sourceId,
    types
  ) {

    const candidates =
      types
        .flatMap(
          type =>
            this.getNodesByType(
              type
            )
        )
        .map(
          n =>
            n.id
        );


    let best =
      null;


    for (
      const candidateId
      of candidates
    ) {

      const result =
        this.dijkstraPartitioned(
          sourceId,
          candidateId
        );


      if (
        result &&
        (
          !best ||
          result.totalWeight <
            best.totalWeight
        )
      ) {

        best = {

          ...result,

          destinationId:
            candidateId
        };
      }
    }


    return best;
  }


  /* =======================================================
     SERIALIZE
     ======================================================= */

  serialize() {

    const edges = [];


    for (
      const [from, adjacency]
      of this.adj
    ) {

      for (
        const edge
        of adjacency
      ) {

        if (
          String(from) <
          String(edge.to)
        ) {

          edges.push({

            id:
              edge.id,

            from:
              edge.from,

            to:
              edge.to,

            distance:
              edge.distance,

            weight:
              edge.weight
          });
        }
      }
    }


    return {

      nodes:
        [
          ...this.nodes.values()
        ],

      edges,

      partitions:
        this.partitions
    };
  }
}


/* =========================================================
   GRAPH SINGLETON
   ========================================================= */

let _instance = null;


const getGraph =
  async (partitionOptions) => {

    // A plain getGraph() call keeps using the cached singleton, same as
    // before. Passing partitionOptions (numPartitions/weights) forces a
    // rebuild so experiments can compare configurations without
    // restarting the server.
    if (_instance && !partitionOptions) {
      return _instance;
    }


    const [nodes] =
      await pool.query(`
        SELECT
          id,
          latitude,
          longitude
        FROM nodes
      `);


    const [edges] =
      await pool.query(`
        SELECT
          id,
          from_node,
          to_node,
          distance
        FROM edges
      `);


    console.log(
      `Loaded ${nodes.length} nodes from MySQL`
    );


    console.log(
      `Loaded ${edges.length} edges from MySQL`
    );


    _instance =
      new Graph(
        nodes,
        edges,
        partitionOptions
      );


    console.log(
      `Graph ready: ${_instance.nodes.size} nodes, ${edges.length} edges`
    );


    return _instance;
  };


module.exports = {
  getGraph
};