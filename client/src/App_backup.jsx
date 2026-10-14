import React, { useEffect, useRef, useState, useCallback } from "react";
import "./styles/main.css";

const API = "http://localhost:5000/api";

const NODE_ICONS = {
  airport:     "✈",
  medical:     "✚",
  transit:     "⬡",
  education:   "🎓",
  emergency:   "🚨",
  commercial:  "🏪",
  business:    "🏢",
  industrial:  "⚙",
  residential: "🏘",
  recreation:  "🌳",
  logistics:   "📦",
  hospitality: "🏨",
  fuel:        "⛽",
  finance:     "🏦",
};

const DESTINATION_GROUPS = [
  { label: "Airport", types: ["airport"] },
  { label: "Hospital", types: ["medical"] },
  { label: "Transit Hub", types: ["transit"] },
  { label: "University", types: ["education"] },
  { label: "Emergency", types: ["emergency"] },
  { label: "Business District", types: ["business"] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const Row = ({ label, val, accent, small }) => (
  <div className="data-row">
    <span className="data-label">{label}</span>
    <span className={`data-val ${accent ? "accent" : ""} ${small ? "small" : ""}`}>
      {val}
    </span>
  </div>
);

    console.log("APP STARTED");
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [source, setSource] = useState(null);
  const [destType, setDestType] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animState, setAnimState] = useState({ visited: new Set(), path: new Set(), pathEdges: [] });
  const [status, setStatus] = useState("idle"); // idle | selecting | animating | done

  useEffect(() => {
    fetch(`${API}/map`)
      .then((r) => r.json())
      .then((d) => setMapData(d.data));
  }, []);

 const draw = useCallback(
  (highlightVisited = new Set(), highlightPath = new Set(), pathEdges = []) => {
    if (!mapData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { nodes, edges } = mapData;

    if (!nodes.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find real latitude/longitude boundaries
    const lats = nodes.map(n => Number(n.latitude));
    const lons = nodes.map(n => Number(n.longitude));

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const padding = 30;

    // Convert latitude/longitude to canvas x/y
    const getXY = (node) => {
      const x =
        padding +
        ((Number(node.longitude) - minLon) /
          (maxLon - minLon || 1)) *
          (canvas.width - padding * 2);

      // Latitude is reversed on canvas
      const y =
        canvas.height -
        padding -
        ((Number(node.latitude) - minLat) /
          (maxLat - minLat || 1)) *
          (canvas.height - padding * 2);

      return { x, y };
    };

    // Store coordinates for fast lookup
    const nodeMap = new Map(
      nodes.map(n => [String(n.id), n])
    );

    const points = new Map();

    for (const n of nodes) {
      points.set(String(n.id), getXY(n));
    }

    // -------------------------------------------------
    // Draw roads
    // -------------------------------------------------

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#52677D55";

    for (const e of edges) {
      const from = points.get(String(e.from));
      const to = points.get(String(e.to));

      if (!from || !to) continue;

      const isPath = pathEdges.some(
        pe =>
          (String(pe.from) === String(e.from) &&
            String(pe.to) === String(e.to)) ||
          (String(pe.from) === String(e.to) &&
            String(pe.to) === String(e.from))
      );

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      if (isPath) {
        ctx.strokeStyle = "#D1CFC9";
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = "#52677D33";
        ctx.lineWidth = 1;
      }

      ctx.stroke();
    }

    // -------------------------------------------------
    // Draw nodes
    // -------------------------------------------------

    for (const n of nodes) {
      const point = points.get(String(n.id));
      if (!point) continue;

      const isVisited = highlightVisited.has(n.id);
      const isPath = highlightPath.has(n.id);
      const isSource = String(n.id) === String(source?.id);

      let radius = 2;
      let fillColor = "#52677D";

      if (isVisited) {
        radius = 3;
        fillColor = "#BDC4D4";
      }

      if (isPath) {
        radius = 5;
        fillColor = "#D1CFC9";
      }

      if (isSource) {
        radius = 7;
        fillColor = "#FFFFFF";
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    // -------------------------------------------------
    // Show source label
    // -------------------------------------------------

    if (source) {
      const point = points.get(String(source.id));

      if (point) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(
          `Source: ${source.id}`,
          point.x + 10,
          point.y - 10
        );
      }
    }

    // -------------------------------------------------
    // Show path node labels
    // -------------------------------------------------

    for (const id of highlightPath) {
      const node = nodeMap.get(String(id));
      const point = points.get(String(id));

      if (!node || !point) continue;

      ctx.fillStyle = "#D1CFC9";
      ctx.font = "10px sans-serif";
      ctx.fillText(
        String(node.id),
        point.x + 7,
        point.y - 7
      );
    }
  },
  [mapData, source]
);


  const handleCanvasClick = (e) => {
  if (!mapData || status === "animating") return;

  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();

  const mouseX =
    (e.clientX - rect.left) *
    (canvas.width / rect.width);

  const mouseY =
    (e.clientY - rect.top) *
    (canvas.height / rect.height);

  const nodes = mapData.nodes;

  const lats = nodes.map(n => Number(n.latitude));
  const lons = nodes.map(n => Number(n.longitude));

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const padding = 30;

  let closest = null;
  let minDist = 12;

  for (const n of nodes) {
    const x =
      padding +
      ((Number(n.longitude) - minLon) /
        (maxLon - minLon || 1)) *
        (canvas.width - padding * 2);

    const y =
      canvas.height -
      padding -
      ((Number(n.latitude) - minLat) /
        (maxLat - minLat || 1)) *
        (canvas.height - padding * 2);

    const distance = Math.hypot(
      x - mouseX,
      y - mouseY
    );

    if (distance < minDist) {
      minDist = distance;
      closest = n;
    }
  }

if (closest) {
  if (!source) {
    // First click → Source
    setSource(closest);
    setDestType(null);
    setResult(null);
    setStatus("selecting");
  } else {
    // Second click → Destination
    setDestType({
      id: closest.id,
      label: `Node ${closest.id}`,
    });
    setResult(null);
    setStatus("selecting");
  }
};

  const findRoute = async () => {
    if (!source || !destType) return;
    setLoading(true);
    setStatus("animating");
    setResult(null);

    try {
      const res = await fetch(`${API}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.id, destination: destType.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const { visitedNodes, path, edges: pathEdges } = data.data;

// Animate the route nodes
const visitedSet = new Set();

for (const nid of path) {
  visitedSet.add(nid);

  setAnimState({
    visited: new Set(visitedSet),
    path: new Set(),
    pathEdges: [],
  });

  await sleep(40);
}

      // Animate path
      const pathSet = new Set();
      const pathEdgesCum = [];
      for (let i = 0; i < path.length; i++) {
        pathSet.add(path[i]);
        if (i > 0 && pathEdges[i - 1]) pathEdgesCum.push(pathEdges[i - 1]);
        setAnimState({ visited: visitedSet, path: new Set(pathSet), pathEdges: [...pathEdgesCum] });
        await sleep(200);
      }

      setResult(data.data);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("selecting");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSource(null);
    setDestType(null);
    setResult(null);
    setAnimState({ visited: new Set(), path: new Set(), pathEdges: [] });
    setStatus("idle");
  };

  return (
    <div className = "app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⬡</span>
          <span className="brand-name">RouteIQ</span>
          <span className="brand-sub">Partition-Based Route Optimization</span>
        </div>
        <div className="topbar-actions">
          <span className="badge">Dijkstra + Graph Partitioning</span>
          <button className="btn-ghost" onClick={reset}>Reset</button>
        </div>
      </header>

      <main className="workspace">
        {/* MAP CANVAS */}
        <div className="map-area">
          <div className="map-header">
            <span>Smart City — {mapData?.nodes.length || 0} nodes · {Object.keys(mapData?.partitions || {}).length} zones</span>
            <span className="map-hint">
              {status === "idle" && "Click a location to set source"}
              {status === "selecting" && source && `Source: ${source.label} — Choose destination type →`}
              {status === "animating" && "Computing route…"}
              {status === "done" && "Route found"}
            </span>
          </div>
          <div className="canvas-wrap">
            <canvas
              ref={canvasRef}
              width={920}
              height={720}
              onClick={handleCanvasClick}
              className={`city-canvas ${status === "animating" ? "no-click" : ""}`}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="side-panel">
          <section className="panel-block">
            <h3 className="panel-title">Route Configuration</h3>
            <label className="field-label">Source Node</label>
            <div className={`field-val ${!source ? "empty" : ""}`}>
              {source ? `${NODE_ICONS[source.type]} ${source.label}` : "Click on the map"}
            </div>

           <label className="field-label mt">Destination Node</label>

           <div className={`field-val ${!destType ? "empty" : ""}`}>
           {destType
            ? `📍 ${destType.id}`
           : source
           ? "Click another location on the map"
          : "Select source first"}
           </div>
            

            <button
              className="btn-primary mt"
              disabled={!source || !destType || loading}
              onClick={findRoute}
            >
              {loading ? "Computing…" : "Find Route"}
            </button>
          </section>

          {result && (
            <>
              <section className="panel-block">
                <h3 className="panel-title">Route Result</h3>
                <Row label="Source" val={result.source.label} />
                <Row label="Destination" val={result.destination.label} />
                <Row label="Path" val={result.pathLabels.join(" → ")} small />
                <Row label="Distance" val={`${result.distanceKm} km`} accent />
                <Row label="ETA" val={`~${result.etaMinutes} min`} accent />
                <Row label="Path Cost" val={result.totalWeight.toLocaleString()} />
                <Row label="Algorithm" val={result.algorithmUsed} />
                <Row label="Status" val="Optimal route found ✓" accent />
              </section>

              <section className="panel-block">
                <h3 className="panel-title">Performance</h3>
                <Row label="Exec Time" val={`${result.execMs} ms`} accent />
                <Row label="Visited Nodes" val={result.visitedNodes.length} />
                <Row label="Total Nodes" val={result.totalNodes} />
                <Row label="Partitions Used" val={result.partitionsTraversed.join(", ")} small />
                <Row label="Memory" val={`${result.memoryUsedKB} KB`} />
                <Row label="Optimization" val={`${result.comparison.improvementPct}% fewer nodes`} accent />
              </section>

              <section className="panel-block comparison">
                <h3 className="panel-title">Comparison</h3>
                <div className="cmp-row header">
                  <span />
                  <span>With Partition</span>
                  <span>Without</span>
                </div>
                <div className="cmp-row">
                  <span>Nodes visited</span>
                  <span className="good">{result.comparison.withPartition.visitedNodes}</span>
                  <span className="bad">{result.comparison.withoutPartition.visitedNodes}</span>
                </div>
                <div className="cmp-row">
                  <span>Exec (ms)</span>
                  <span className="good">{result.comparison.withPartition.execMs}</span>
                  <span className="bad">{result.comparison.withoutPartition.execMs}</span>
                </div>
                <div className="cmp-row">
                  <span>Search space</span>
                  <span className="good">{result.comparison.withPartition.searchSpace}</span>
                  <span className="bad">{result.comparison.withoutPartition.searchSpace}</span>
                </div>
                <div className="improvement-badge">
                  {result.comparison.improvementPct}% improvement
                </div>
              </section>
            </>
          )}
        </aside>
      </main>
    </div>
  );
 }
}
