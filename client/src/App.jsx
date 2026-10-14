import React, {

  useEffect,

  useRef,

  useState,

  useCallback,

} from "react";

import "./styles/main.css";



const API = "http://localhost:5000/api";

// Main Asian airports used in the route selectors.
// The numeric IDs are the IDs used by the current project dataset.
const FEATURED_AIRPORTS = [
  // India
  { id: 4189, label: "Chennai International Airport (MAA)" },
  { id: 3093, label: "Indira Gandhi International Airport (DEL)" },
  { id: 2172, label: "Chhatrapati Shivaji Maharaj International Airport (BOM)" },
  { id: 3131, label: "Kempegowda International Airport (BLR)" },
  { id: 3135, label: "Coimbatore International Airport (CJB)" },
  { id: 3136, label: "Cochin International Airport (COK)" },
  { id: 3143, label: "Mangalore International Airport (IXE)" },
  { id: 3152, label: "Tiruchirappalli International Airport (TRZ)" },
  { id: 3153, label: "Trivandrum International Airport (TRV)" },

  // China
  { id: 3364, label: "Beijing Capital International Airport (PEK)" },
  { id: 3370, label: "Guangzhou Baiyun International Airport (CAN)" },
  { id: 3374, label: "Shenzhen Bao'an International Airport (SZX)" },
  { id: 3376, label: "Wuhan Tianhe International Airport (WUH)" },
  { id: 3379, label: "Xi'an Xianyang International Airport (XIY)" },
  { id: 3382, label: "Kunming Changshui International Airport (KMG)" },
  { id: 3383, label: "Xiamen Gaoqi International Airport (XMN)" },
  { id: 3386, label: "Hangzhou Xiaoshan International Airport (HGH)" },
  { id: 3391, label: "Shanghai Hongqiao International Airport (SHA)" },
  { id: 3393, label: "Chongqing Jiangbei International Airport (CKG)" },
  { id: 3406, label: "Shanghai Pudong International Airport (PVG)" },

  // Japan
  { id: 2279, label: "Narita International Airport, Tokyo (NRT)" },
  { id: 2359, label: "Tokyo Haneda International Airport (HND)" },
  { id: 2287, label: "New Chitose Airport, Sapporo (CTS)" },
  { id: 2305, label: "Fukuoka Airport (FUK)" },
  { id: 3992, label: "Kansai International Airport, Osaka (KIX)" },
  { id: 3942, label: "Chubu Centrair International Airport, Nagoya (NGO)" },
  { id: 2384, label: "Naha Airport, Okinawa (OKA)" },

  // Southeast Asia
  { id: 3316, label: "Singapore Changi Airport (SIN)" },
  { id: 3304, label: "Kuala Lumpur International Airport (KUL)" },
  { id: 3885, label: "Suvarnabhumi Airport, Bangkok (BKK)" },
  { id: 3157, label: "Don Mueang International Airport, Bangkok (DMK)" },
  { id: 3275, label: "Soekarno-Hatta International Airport, Jakarta (CGK)" },
  { id: 3940, label: "Ngurah Rai International Airport, Bali (DPS)" },
  { id: 4090, label: "Francisco Bangoy International Airport, Davao (DVO)" },
  { id: 3199, label: "Noi Bai International Airport, Hanoi (HAN)" },
  { id: 3205, label: "Tan Son Nhat International Airport, Ho Chi Minh City (SGN)" },
  { id: 3196, label: "Da Nang International Airport (DAD)" },
  { id: 3239, label: "Yangon International Airport (RGN)" },

  // South Korea / Taiwan / Hong Kong / Macau
  { id: 3930, label: "Incheon International Airport, Seoul (ICN)" },
  { id: 2378, label: "Gimpo International Airport, Seoul (GMP)" },
  { id: 2372, label: "Gimhae International Airport, Busan (PUS)" },
  { id: 2276, label: "Taiwan Taoyuan International Airport (TPE)" },
  { id: 3121, label: "Macau International Airport (MFM)" },

  // Middle East
  { id: 2188, label: "Dubai International Airport (DXB)" },
  { id: 2179, label: "Abu Dhabi International Airport (AUH)" },
  { id: 11051, label: "Hamad International Airport, Doha (DOH)" },
  { id: 2194, label: "Muscat International Airport (MCT)" },
  { id: 2176, label: "Kuwait International Airport (KWI)" },
  { id: 2177, label: "Beirut Rafic Hariri International Airport (BEY)" },
  { id: 2170, label: "Queen Alia International Airport, Amman (AMM)" },
  { id: 2191, label: "Sharjah International Airport (SHJ)" },

  // South Asia / Central Asia
  { id: 3125, label: "Tribhuvan International Airport, Kathmandu (KTM)" },
  { id: 3156, label: "Malé International Airport (MLE)" },
  { id: 3120, label: "Wattay International Airport, Vientiane (VTE)" },
  { id: 3378, label: "Pyongyang Sunan International Airport (FNJ)" },
  { id: 3365, label: "Tianjin Binhai International Airport (TSN)" },
  { id: 3387, label: "Ningbo Lishe International Airport (NGB)" },
  { id: 3390, label: "Qingdao Jiaodong/Liuting Airport (TAO)" },
  { id: 3200, label: "Cam Ranh International Airport (NHA)" },
  { id: 3272, label: "Brunei International Airport (BWN)" },
];

const Row = ({ label, val, accent, small }) => (

  <div className="data-row">

    <span className="data-label">{label}</span>

    <span

      className={`data-val ${accent ? "accent" : ""} ${

        small ? "small" : ""

      }`}

    >

      {val}

    </span>

  </div>

);



export default function App() {

  const canvasRef = useRef(null);



  const [mapData, setMapData] = useState(null);

  const [source, setSource] = useState(null);


  const [destination, setDestination] = useState(null);
  const [reachableDestinations, setReachableDestinations] = useState(new Set());
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");



  const [animState, setAnimState] = useState({

    visited: new Set(),

    path: new Set(),

    pathEdges: [],

  });



  // --------------------------------------------------

  // LOAD MAP

  // --------------------------------------------------



  useEffect(() => {

    console.log("APP STARTED");



    fetch(`${API}/map`)

      .then((response) => {

        if (!response.ok) {

          throw new Error(`Map request failed: ${response.status}`);

        }

        return response.json();

      })

      .then((data) => {

        console.log("MAP LOADED:", data);



        if (!data.success && !data.data) {

          throw new Error(data.error || "Invalid map response");

        }



        setMapData(data.data || data);

      })

      .catch((err) => {

        console.error("MAP ERROR:", err);

        setError(err.message);

      });

  }, []);



  // --------------------------------------------------

  // GET CANVAS POSITION

  // --------------------------------------------------

  // Keep only destinations that are actually reachable from the selected source.
  useEffect(() => {
    if (!mapData || !source) {
      setReachableDestinations(new Set());
      return;
    }

    const adjacency = new Map();
    for (const node of mapData.nodes || []) {
      adjacency.set(String(node.id), []);
    }

    for (const edge of mapData.edges || []) {
      const from = String(edge.from);
      const to = String(edge.to);
      if (!adjacency.has(from) || !adjacency.has(to)) continue;
      adjacency.get(from).push(to);
      adjacency.get(to).push(from);
    }

    const start = String(source.id);
    const visited = new Set([start]);
    const queue = [start];
    let index = 0;

    while (index < queue.length) {
      const current = queue[index++];
      for (const next of adjacency.get(current) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    visited.delete(start);
    setReachableDestinations(visited);
  }, [mapData, source]);



  const getNodePosition = useCallback(

    (node, canvas, nodes) => {

      if (!node || !nodes?.length) return null;



      const lats = nodes.map((n) => Number(n.latitude));

      const lons = nodes.map((n) => Number(n.longitude));



      const minLat = Math.min(...lats);

      const maxLat = Math.max(...lats);

      const minLon = Math.min(...lons);

      const maxLon = Math.max(...lons);



      const padding = 30;



      const x =

        padding +

        ((Number(node.longitude) - minLon) /

          (maxLon - minLon || 1)) *

          (canvas.width - padding * 2);



      const y =

        canvas.height -

        padding -

        ((Number(node.latitude) - minLat) /

          (maxLat - minLat || 1)) *

          (canvas.height - padding * 2);



      return { x, y };

    },

    []

  );



  // --------------------------------------------------

  // DRAW MAP

  // --------------------------------------------------



  const draw = useCallback(

    (

      highlightVisited = new Set(),

      highlightPath = new Set(),

      pathEdges = []

    ) => {

      if (!mapData || !canvasRef.current) return;



      const canvas = canvasRef.current;

      const ctx = canvas.getContext("2d");



      const nodes = mapData.nodes || [];

      const edges = mapData.edges || [];



      if (!nodes.length) return;



      ctx.clearRect(0, 0, canvas.width, canvas.height);



      // Calculate boundaries once

      const lats = nodes.map((n) => Number(n.latitude));

      const lons = nodes.map((n) => Number(n.longitude));



      const minLat = Math.min(...lats);

      const maxLat = Math.max(...lats);

      const minLon = Math.min(...lons);

      const maxLon = Math.max(...lons);



      const padding = 30;



      const getXY = (node) => {

        const x =

          padding +

          ((Number(node.longitude) - minLon) /

            (maxLon - minLon || 1)) *

            (canvas.width - padding * 2);



        const y =

          canvas.height -

          padding -

          ((Number(node.latitude) - minLat) /

            (maxLat - minLat || 1)) *

            (canvas.height - padding * 2);



        return { x, y };

      };



      const points = new Map();



      for (const node of nodes) {

        points.set(String(node.id), getXY(node));

      }



      // ----------------------------------------------

      // Draw roads

      // ----------------------------------------------



      ctx.lineWidth = 1;

      ctx.strokeStyle = "#52677D33";



      const pathEdgeSet = new Set(

        pathEdges.map(

          (e) => `${String(e.from)}-${String(e.to)}`

        )

      );



      for (const edge of edges) {

        const from = points.get(String(edge.from));

        const to = points.get(String(edge.to));



        if (!from || !to) continue;



        const normalKey = `${String(edge.from)}-${String(

          edge.to

        )}`;



        const reverseKey = `${String(edge.to)}-${String(

          edge.from

        )}`;



        const isPath =

          pathEdgeSet.has(normalKey) ||

          pathEdgeSet.has(reverseKey);



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



      // ----------------------------------------------

      // Draw nodes

      // ----------------------------------------------



      for (const node of nodes) {

        const point = points.get(String(node.id));



        if (!point) continue;



        const isVisited =

          highlightVisited.has(node.id) ||

          highlightVisited.has(String(node.id));



        const isPath =

          highlightPath.has(node.id) ||

          highlightPath.has(String(node.id));



        const isSource =

          String(node.id) === String(source?.id);



        const isDestination =

          String(node.id) === String(destination?.id);



        let radius = 1.8;

        let fill = "#52677D";



        if (isVisited) {

          radius = 2.5;

          fill = "#BDC4D4";

        }



        if (isPath) {

          radius = 4;

          fill = "#D1CFC9";

        }



        if (isSource) {

          radius = 7;

          fill = "#FFFFFF";

        }



        if (isDestination) {

          radius = 7;

          fill = "#FFFFFF";

        }



        ctx.beginPath();

        ctx.arc(

          point.x,

          point.y,

          radius,

          0,

          Math.PI * 2

        );



        ctx.fillStyle = fill;

        ctx.fill();

      }



      // ----------------------------------------------

      // Source label

      // ----------------------------------------------



      if (source) {

        const point = points.get(String(source.id));



        if (point) {

          ctx.fillStyle = "#FFFFFF";

          ctx.font = "bold 12px sans-serif";



          ctx.fillText(

            `Source: ${source.label || source.name || source.id}`,

            point.x + 10,

            point.y - 10

          );

        }

      }



      // ----------------------------------------------

      // Destination label

      // ----------------------------------------------



      if (destination) {

        const point = points.get(String(destination.id));



        if (point) {

          ctx.fillStyle = "#FFFFFF";

          ctx.font = "bold 12px sans-serif";



          ctx.fillText(

            `Destination: ${destination.label || destination.name || destination.id}`,

            point.x + 10,

            point.y + 18

          );

        }

      }

    },

    [mapData, source, destination]

  );



  // --------------------------------------------------

  // REDRAW WHEN DATA / SELECTION CHANGES

  // --------------------------------------------------



  useEffect(() => {

    draw(

      animState.visited,

      animState.path,

      animState.pathEdges

    );

  }, [mapData, source, destination, animState, draw]);



  // --------------------------------------------------
  // FIND ROUTE
  // --------------------------------------------------
const findRoute = async () => {

    if (!source || !destination || loading) return;



    setLoading(true);

    setError("");

    setResult(null);

    setStatus("animating");



    try {

      const response = await fetch(`${API}/route`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          source: source.id,

          destination: destination.id,

        }),

      });



      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(

          data.error || "Route calculation failed"

        );

      }



      const route = data.data;



      const visitedNodes = route.visitedNodes || [];

      const path = route.path || [];

      const pathEdges = route.edges || [];



      // ----------------------------------------------

      // SHOW ROUTE IMMEDIATELY

      // ----------------------------------------------

      // The old animation waited 15ms for every visited node.

      // With 7,153 visited nodes, that alone takes over 100 seconds.

      // Show the complete route immediately instead.



      setAnimState({

        visited: new Set(visitedNodes),

        path: new Set(path),

        pathEdges: pathEdges,

      });



      setResult(route);

      setStatus("done");

    } catch (err) {

      console.error("ROUTE ERROR:", err);



      setError(err.message);

      setStatus("selecting");

    } finally {

      setLoading(false);

    }

  };



  // --------------------------------------------------

  // RESET

  // --------------------------------------------------



  const reset = () => {

    setSource(null);

    setDestination(null);

    setResult(null);

    setError("");



    setAnimState({

      visited: new Set(),

      path: new Set(),

      pathEdges: [],

    });



    setStatus("idle");

  };



  // --------------------------------------------------

  // RENDER

  // --------------------------------------------------



  return (

    <div className="app">

      <header className="topbar">

        <div className="brand">

          <span className="brand-mark">⬡</span>

          <span className="brand-name">RouteIQ</span>

          <span className="brand-sub">

            Airways Route Optimization

          </span>

        </div>



        <div className="topbar-actions">

          <span className="badge">

            Hybrid Partitioning + Dijkstra

          </span>



          <button

            className="btn-ghost"

            onClick={reset}

          >

            Reset

          </button>

        </div>

      </header>



      <main className="workspace">

        {/* MAP */}

        <div className="map-area">

          <div className="map-header">

            <span>

              Airways Network —{" "}

              {mapData?.nodes?.length || 0} nodes ·{" "}

              {Object.keys(mapData?.partitions || {}).length} partitions

            </span>



            <span className="map-hint">
              {status === "idle" &&
                "Select source and destination from the panel"}

              {status === "selecting" &&
                source &&
                destination &&
                "Source and destination selected — click Find Route"}

              {status === "animating" &&
                "Computing route…"}

              {status === "done" &&
                "Route found"}
            </span>

          </div>



          <div className="canvas-wrap">

            <canvas

              ref={canvasRef}

              width={920}

              height={720}


              className={`city-canvas ${

                loading ? "no-click" : ""

              }`}

            />



            {!mapData && !error && (

              <div

                style={{

                  position: "absolute",

                  inset: 0,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  color: "white",

                }}

              >

                Loading Airways network…

              </div>

            )}



            {error && (

              <div

                style={{

                  position: "absolute",

                  left: 20,

                  right: 20,

                  bottom: 20,

                  padding: 15,

                  background: "#3a1111",

                  color: "#ffb3b3",

                  borderRadius: 8,

                }}

              >

                {error}

              </div>

            )}

          </div>

        </div>



        {/* RIGHT PANEL */}

        <aside className="side-panel">

            <h3 className="panel-title">

              Route Configuration

            </h3>



            <label className="field-label">
              Source Airport
            </label>

            <select
              className="field-val"
              value={source?.id ?? ""}
              onChange={(e) => {
                const node = (mapData?.nodes || []).find(
                  (item) => String(item.id) === e.target.value
                );

                if (!node) return;

                setSource({
                  ...node,
                  label:
                    FEATURED_AIRPORTS.find(
                      (airport) => String(airport.id) === String(node.id)
                    )?.label || node.label || `Airport Node ${node.id}`,
                });
                setDestination(null);
                setResult(null);
                setError("");
                setStatus("selecting");
                setAnimState({
                  visited: new Set(),
                  path: new Set(),
                  pathEdges: [],
                });
              }}
              disabled={loading || !mapData}
            >
              <option value="">Select Source Airport</option>
              {FEATURED_AIRPORTS
                .filter((airport) =>
                  (mapData?.nodes || []).some(
                    (node) => String(node.id) === String(airport.id)
                  )
                )
                .map((airport) => (
                  <option key={airport.id} value={airport.id}>
                    {airport.label}
                  </option>
                ))}
            </select>

            <label className="field-label mt">
              Destination Airport
            </label>

            <select
              className="field-val"
              value={destination?.id ?? ""}
              onChange={(e) => {
                const node = (mapData?.nodes || []).find(
                  (item) => String(item.id) === e.target.value
                );

                if (!node) return;

                if (source && String(node.id) === String(source.id)) {
                  setError("Destination must be different from the source airport.");
                  return;
                }

                setDestination({
                  ...node,
                  label:
                    FEATURED_AIRPORTS.find(
                      (airport) => String(airport.id) === String(node.id)
                    )?.label || node.label || `Airport Node ${node.id}`,
                });
                setResult(null);
                setError("");
                setStatus("selecting");
                setAnimState({
                  visited: new Set(),
                  path: new Set(),
                  pathEdges: [],
                });
              }}
              disabled={loading || !mapData}
            >
              <option value="">
                {source
                  ? `Select Destination Airport (${reachableDestinations.size} reachable)`
                  : "Select Source Airport First"}
              </option>
              {FEATURED_AIRPORTS
                .filter(
                  (airport) =>
                    source &&
                    String(airport.id) !== String(source.id) &&
                    reachableDestinations.has(String(airport.id))
                )
                .map((airport) => (
                  <option key={airport.id} value={airport.id}>
                    {airport.label}
                  </option>
                ))}
            </select>

            <button
              className="btn-primary mt"
              disabled={!source || !destination || loading}
              onClick={findRoute}
            >
              {loading ? "Computing…" : "Find Route"}
            </button>

            {result && (

            <>

              <section className="panel-block">

                <h3 className="panel-title">

                  Route Result

                </h3>



                <Row

                  label="Source Airport"

                  val={

                    result.source?.label ||

                    result.source?.id ||

                    source?.id ||

                    "-"

                  }

                />



                <Row

                  label="Destination Airport"

                  val={

                    result.destination?.label ||

                    result.destination?.id ||

                    destination?.id ||

                    "-"

                  }

                />



                <Row

                  label="Path"

                  val={

                    result.pathLabels?.join(" → ") ||

                    result.path?.join(" → ") ||

                    "-"

                  }

                  small

                />



                <Row

                  label="Distance"

                  val={`${result.distanceKm ?? "-"} km`}

                  accent

                />



                <Row

                  label="ETA"

                  val={`~${result.etaMinutes ?? "-"} min`}

                  accent

                />



                <Row

                  label="Path Cost"

                  val={

                    result.totalWeight?.toLocaleString?.() ??

                    result.totalWeight ??

                    "-"

                  }

                />



                <Row

                  label="Algorithm"

                  val={

                    result.algorithmUsed ||

                    "Dijkstra"

                  }

                />



                <Row

                  label="Status"

                  val="Optimal route found ✓"

                  accent

                />

              </section>



              <section className="panel-block">

                <h3 className="panel-title">

                  Performance

                </h3>



                <Row

                  label="Exec Time"

                  val={`${result.execMs ?? "-"} ms`}

                  accent

                />



                <Row

                  label="Visited Nodes"

                  val={

                    Array.isArray(result.visitedNodes)

                      ? result.visitedNodes.length

                      : result.visitedNodes ?? "-"

                  }

                />



                <Row

                  label="Total Nodes"

                  val={result.totalNodes ?? "-"}

                />



                <Row

                  label="Partitions Used"

                  val={

                    result.partitionsTraversed?.join(

                      ", "

                    ) || "-"

                  }

                  small

                />



                <Row

                  label="Memory"

                  val={`${result.memoryUsedKB ?? "-"} KB`}

                />



                <Row

                  label="Optimization"

                  val={

                    result.comparison

                      ? `${

                          result.comparison

                            .improvementPct ?? 0

                        }% fewer nodes`

                      : "-"

                  }

                  accent

                />

              </section>



              {result.comparison && (

                <section className="panel-block comparison">

                  <h3 className="panel-title">

                    Comparison

                  </h3>



                  <div className="cmp-row header">

                    <span />

                    <span>With Partition</span>

                    <span>Without</span>

                  </div>



                  <div className="cmp-row">

                    <span>Nodes visited</span>



                    <span className="good">

                      {

                        result.comparison

                          .withPartition

                          ?.visitedNodes

                      }

                    </span>



                    <span className="bad">

                      {

                        result.comparison

                          .withoutPartition

                          ?.visitedNodes

                      }

                    </span>

                  </div>



                  <div className="cmp-row">

                    <span>Exec (ms)</span>



                    <span className="good">

                      {

                        result.comparison

                          .withPartition?.execMs

                      }

                    </span>



                    <span className="bad">

                      {

                        result.comparison

                          .withoutPartition?.execMs

                      }

                    </span>

                  </div>



                  <div className="cmp-row">

                    <span>Search space</span>



                    <span className="good">

                      {

                        result.comparison

                          .withPartition?.searchSpace

                      }

                    </span>



                    <span className="bad">

                      {

                        result.comparison

                          .withoutPartition?.searchSpace

                      }

                    </span>

                  </div>



                  <div className="improvement-badge">

                    {

                      result.comparison

                        .improvementPct ?? 0

                    }

                    % improvement

                  </div>

                </section>

              )}

            </>

          )}

        </aside>

      </main>

    </div>

  );

}