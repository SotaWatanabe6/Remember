"use client";
import { useEffect, useMemo, useRef,useState } from "react";
import * as d3 from "d3";
import {
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { usePathname } from "next/navigation";

function capitalizeFirstLetter(str) {
  if (!str || str === 'null') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}


function placeholderProminence(index) {
  return 0.3 + ((index * 37) % 40) / 100;
}

function placeholderCoordinate(index, limit) {
  return ((index * 149) % limit) + 20;
}

// CSS animations for constellation graph
const styles = `
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }
  
  .modal-enter {
    animation: fadeInScale 300ms ease-out;
  }
  
  .node-highlight {
    transition: r 300ms ease-out, fill 200ms ease-out;
  }
  
  .pulse-node {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Inject styles on component mount
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}


// Pulsing placeholder for constellation loading state
function PulsingPlaceholder() {
  const placeholderNodes = [...Array(8)].map((_, i) => ({
    id: `placeholder-${i}`,
    x: 100 + (i % 3) * 200,
    y: 150 + Math.floor(i / 3) * 150,
    prominence: placeholderProminence(i),
  }));

  const placeholderLinks = placeholderNodes.slice(0, -1).map((node, i) => ({
    source: node,
    target: placeholderNodes[i + 1],
  }));

  return (
    <svg width="100%" height="400" viewBox="0 0 800 400" className="border border-neutral-200 rounded-2xl bg-neutral-50">
      {/* Placeholder edges */}
      {placeholderLinks.map((link, i) => (
        <line
          key={`link-${i}`}
          x1={link.source.x}
          y1={link.source.y}
          x2={link.target.x}
          y2={link.target.y}
          stroke="#e5e7eb"
          strokeWidth="1"
          className="pulse-node"
        />
      ))}
      
      {/* Placeholder nodes */}
      {placeholderNodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.prominence * 40 + 20}
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth="2"
          className="pulse-node"
        />
      ))}
    </svg>
  );
}

function buildRelationshipCounts(contributors = []) {
  const counts = contributors.reduce((acc, contributor) => {
    const type = capitalizeFirstLetter(contributor.relationship_type) || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([relationship_type, count]) => ({
    relationship_type,
    count,
  }));
}

// Replace the entire buildRelationshipGraph function:
function buildRelationshipGraph(contributors, centerId, centerName, relationships = []) {
  const contributorNodes = (contributors || []).map((c) => {
    const relType = (c.relationship_type || 'other').toLowerCase();
    const relData = relationships.find((r) => r.type === relType) || {};
    return {
      id: c.id,
      name: c.name || 'Contributor',
      relationship_type: capitalizeFirstLetter(c.relationship_type) || 'Other',
      prominence: 0.7,
      summary: relData.summary || '',
      photos: relData.photos || [],
      photo_urls: relData.photos || [],
      quotes: relData.quote ? [{ text: relData.quote, contributor_name: c.name }] : [],
      contributions: 1,
    };
  });

  return {
    nodes: [
      {
        id: centerId,
        name: centerName,
        relationship_type: 'Memorial',
        prominence: 1,
        summary: '',
        photos: [],
        quotes: [],
        contributions: 0,
      },
      ...contributorNodes,
    ],
    links: contributorNodes.map((node) => ({
      source: centerId,
      target: node.id,
      type: node.relationship_type,
      weight: 1,
    })),
  };
}

export default function ConstellationGraph({
  ai_output,
  memorial,
  contributor = [],
  relationships = [],
  width,
  height,
}) {
  const ref = useRef(null);
  const pathname = usePathname();  
  const [constellationLoading, setConstellationLoading] = useState(false);
  const [themes,setThemes] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tab, setTab] = useState("Themes");
  const [hiddenContributors, setHiddenContributors] = useState({});
  const [hiddenRelationshipType, setHiddenRelationshipType] = useState({});
  const [hiddenThemes, setHiddenThemes] = useState({});
  const [currentPage, setCurrentPage] = useState("Viewer");
  useEffect(() => {
    if (pathname.includes("output")){
      setCurrentPage("Viewer");
    }
    else {
      setCurrentPage("Manage");
    }
  },[currentPage, pathname]);

  const handleThemesChange = (nodeId) => {
    setHiddenThemes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));    
  };  

  const handleRelationshipTypesChange = (nodeId) => {
    setHiddenRelationshipType((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
    
  };  
  
  const toggleEye = (id) => {
    setHiddenContributors((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  };  
  const relationshipCounts = buildRelationshipCounts(contributor || []);

  const [nodes, setNodes] = useState(
      ai_output?.constellation?.nodes?.map(t => ({
        id: t.id,
        name: t.label,
        group: capitalizeFirstLetter(t.category),
        prominence: t.prominence_score,
        summary: t.summary,
        photo_urls: t.photo_urls || [],
        photos: t.photo_urls || t.photo_ids || [],
        quotes: t.quotes || [],
        contributions: (t.photo_urls || []).length,
      })) || []
);

  const [links, setLinks] = useState(
    ai_output?.constellation?.edges?.map(d => ({
      source: d.source,
      target: d.target,
      type: capitalizeFirstLetter(d.relationship_type),
      weight: d.weight
    })) || []
  );
  
  const categoriesColor = {
    "Family": "#C8A99A" ,
    "Friend": "#D97B6C" ,
    "Colleague": "#8FAF82" ,
    "Others": "#A8BFCF",
    "Community": "#C9A08F",
    "null": "#5cd6c6"
  };
  // Generate placeholder nodes for loading state
  const placeholderNodes = [...Array(8)].map((_, i) => ({
    id: `placeholder-${i}`,
    name: `Node ${i + 1}`,
    group: 'placeholder',
    prominence: placeholderProminence(i),
    summary: '',
    photos: [],
    quotes: [],
    x: placeholderCoordinate(i, 600),
    y: placeholderCoordinate(i + 3, 400),
  }));

  const relationshipGraph = useMemo(
    () => buildRelationshipGraph(
      contributor,
      memorial?.id || 'memorial-center',
      memorial?.subject_name || memorial?.deceased_name || 'Memorial',
      relationships || [],
    ),
    [contributor, memorial?.id, memorial?.subject_name, memorial?.deceased_name, relationships],
  );

  const graphNodes = tab === "Relationships" ? relationshipGraph.nodes : nodes;
  const graphLinks = tab === "Relationships" ? relationshipGraph.links : links;

  
  const handleChange = (e) => {
      setTab(e.target.value);
      if (e.target.value === "Themes") {

        setNodes(ai_output?.constellation?.nodes?.map(t => ({
          id: t.id,
          name: t.label,
          group: t.category,
          prominence: t.prominence_score,
          summary: t.summary,
          photo_urls: t.photo_urls || [],
          photos: t.photo_urls || t.photo_ids || [],
          quotes: t.quotes || [],
          contributions: (t.photo_urls || []).length,
        })) || []);
        setLinks(ai_output?.constellation?.edges?.map(d => ({
          source: d.source,
          target: d.target,
          type: capitalizeFirstLetter(d.relationship_type),
          weight: d.weight
        })) || []);
    }
  }

  useEffect(() => {
    if (!graphNodes || graphNodes.length === 0) return;
    if (!graphLinks) return;
    if (!tab) return;
    if (!hiddenRelationshipType) return;
    if (!hiddenContributors) return;
    if (!hiddenThemes) return;

    const edgeStyle = (type) => {
      switch (type) {
        case "Family":
          return ""; // solid
        case "Friend":
          return "6,4"; // dashed
        case "Colleague":
          return "2,4"; // dotted
        case "Community":
          return "10,4,2,4"; // long-dash pattern
        default:
          return "";
      }
    };
    let displayNode=[];
    let displayLink=[];
    if (tab === "Themes") {

      displayNode=graphNodes.filter(
        (node) => !hiddenThemes[node.id]
      );
      displayLink=graphLinks.filter(
        (link) =>
          !hiddenThemes[link.source.id] &&
          !hiddenThemes[link.target.id]
      );
    }
    else {
      const centerId = memorial?.id || 'memorial-center';
      displayNode = graphNodes.filter(
        (node) =>
          node.id === centerId || !hiddenRelationshipType[node.relationship_type],
      );
      displayLink = graphLinks.filter((link) => !hiddenRelationshipType[link.type]);
      displayNode = displayNode.filter(
        (item) => item.id === centerId || !hiddenContributors[item.id],
      );
      displayLink = displayLink.filter(
        (link) =>
          !hiddenContributors[
            typeof link.target === 'object' ? link.target.id : link.target
          ],
      );
    }

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();
    

    const simulation = d3
      .forceSimulation(displayNode)
      .force(
        "link",
        d3.forceLink(displayLink).id((d) => d.id).distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(100));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(displayLink)
      .enter()
      .append("line")
      .attr("stroke", "#000000")
      .attr("stroke-width", d => d.weight || 1)
      .attr("stroke-dasharray", d => edgeStyle(d.type));

      
    svg.append("defs")
    .append("pattern")
    .attr("id", "img-pattern")
    .attr("width", 1)
    .attr("height", 1)
    .attr("patternContentUnits", "objectBoundingBox")
    .append("image")
    .attr("xlink:href", memorial?.cover_photo_url)
    .attr("width", 1)
    .attr("height", 1)
    .attr("preserveAspectRatio", "xMidYMid slice");

    const node = svg
    .append("g")
    .selectAll("circle")
    .data(displayNode)
    .enter()
    .append("circle")
    .attr("r", d=> d.prominence * 80 + 5) // size based on prominence
    .attr("cx", 100)
    .attr("cy", 100)
    .attr("fill", d => d.relationship_type==="Memorial" ? "url(#img-pattern)" : categoriesColor[d.relationship_type] || "#b1bc93")
    // .attr("stroke", d => categoriesColor[d.relationship_type] || "#b1bc93")
    .call(
      d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    )
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      setSelectedNode(d);
    });
    function truncate(text, maxLength = 10) {
      return text.length > maxLength
        ? text.slice(0, maxLength) + "..."
        : text;
    }
    const label = svg
    .append("g")
    .selectAll("text")
    .data(displayNode)
    .enter()
    .append("text")
    .filter(d => d.relationship_type !== "Memorial")
    .text((d) =>truncate(d.name, 12) || " No theme ")
    .attr("font-size", 14)
    .style("font-family", "Arial")
    .style("font-weight", "bold")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("text-anchor", "middle")   
    .attr("dominant-baseline", "middle");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });
    
    // Add smooth transition when nodes enter
    node.transition()
      .duration(500)
      .attr("opacity", 1);
      
    link.transition()
      .duration(500)
      .attr("opacity", 1);

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [graphNodes, graphLinks, hiddenRelationshipType, hiddenContributors, hiddenThemes, tab, width, height, memorial?.id]);

  return (
    <div>
      {
        currentPage === "Manage" ? (
          <div className="mb-6">
            <select
              value={tab}
              onChange={handleChange}
              className="border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm outline-none"
            >
              <option value="Themes">
                Constellation : Themes
              </option>

              <option value="Relationships">
                Constellation : Relationships
              </option>
            </select>

            <h2 className="mt-8 mb-4 text-2xl font-serif italic">
              Constellation
            </h2>        
          </div> 
        ) : (
        <div className="flex justify-between items-center px-15 pt-8">
          <div className="flex gap-10 cursor-pointer text-lg">
            <button className={tab==="Themes" ? "text-[#3c3c3c] border-[#3c3c3c] border-b pb-2" : "text-[#8a8a8a] border-[#8a8a8a] border-b pb-2"}
              onClick={() => setTab("Themes")}
            >
              Themes
            </button>

            <button className={tab==="Relationships" ? "text-[#3c3c3c] border-[#3c3c3c] border-b pb-2" : "text-[#8a8a8a] border-[#8a8a8a] border-b pb-2"}
              onClick={() => setTab("Relationships")}
            >
              Relationships
            </button>
          </div>
          <select className="border border-[#c8beb0] bg-[#faf7f2] rounded-md px-4 py-2">
            <option>Sort</option>
            <option>Name</option>
            <option>Date</option>
          </select>
        </div>
        ) 
      }
        {selectedNode ? (
          <div className="bg-[#F2EEE8] relative h-full w-full pt-10">
            { themes ? 
              (
                <div className="flex px-15 py-8 gap-10">
                  {/* Sidebar */}
                  <aside className="w-48 pt-28">
                    <h1 className="text-5xl font-serif font-semibold mb-8">
                      {selectedNode.name || selectedNode.label}
                    </h1>

                    <button 
                      className="bg-[#cbbca8] hover:bg-[#bca992] transition px-6 py-3 rounded-full text-sm"
                      onClick={() => { setThemes(null)}}
                    >
                      Back to themes
                    </button>
                  </aside>

                  {/* Content Panel */}
                  <section className="flex-1">
                    <div className="bg-[#f8f4ef] border border-[#c8beb0] rounded-lg p-6 h-[full] overflow-y-auto">
                      {/* Card 1 */}
                      <div className="bg-[#cdbfae] h-40 rounded-sm mb-4"></div>

                      {/* Card 2 */}
                      <div className="bg-[#cdbfae] h-72 rounded-sm"></div>
                    </div>
                  </section>
                </div>              
              ) : (
              <section className="relative max-w-7xl mx-auto px-8 py-16">
                <button 
                  className="absolute top-8 right-8 text-4xl text-[#4A443E] cursor-pointer"
                  onClick={() => setSelectedNode(null)}
                >
                  x
                </button>

                <div className="flex flex-col lg:flex-row items-center gap-8 ml-[80px]">
                  {/* Left Side */}
                    <div className="relative flex items-center">
                    {/* Horizontal Line */}
                      <div className="w-[140px] h-[2px] bg-[#75835F]" />
                      {/* Circle Image */}
                      <div className="w-[260px] h-[260px] rounded-full border border-[#75835F] overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img
                          src="/placeholder.png"
                          alt="Theme"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="max-w-md">
                      <h1 className="text-5xl font-serif text-[#4A443E] mb-6">
                        {selectedNode.name || selectedNode.label}
                      </h1>

                      <p className="text-[#6B655F] leading-relaxed mb-12">
                        {selectedNode.summary || "No summary available for this theme."}
                      </p>

                      <button 
                        className="bg-[#D2C2AA] hover:bg-[#C7B499] transition-colors px-10 py-4 rounded-full text-[#4A443E]"
                        onClick={() => {
                          setThemes(selectedNode.id);
                        }}
                      >
                        View all
                      </button>
                    </div>
                </div>
              </section>
              )
            }            
          </div>     
        ):    
        <div className="relative h-full w-full rounded-sm p-10">        
          <svg ref={ref} ></svg>
          {tab === "Relationships" &&  (
          <div className="absolute bottom-4 left-4 inline-flex flex-col gap-3 rounded-2xl bg-[#F5EDE6] px-6 py-5 shadow-sm">
              <h3 className="font-semibold text-[#5C4A3A] tracking-wide text-sm uppercase mb-1">Legend</h3>
              <ul className="flex flex-col gap-2.5">
                  {
                    relationshipCounts.map((item, index) => {
                    return (
                      // <div key={index} className="flex items-center gap-2">
                      //   <div className="h-3 w-3 rounded-sm bg-white" />
                      //   <span>{item.relationship_type == "null" || item.relationship_type == undefined ? "No relationship type" : item.relationship_type}</span>
                      // </div>
                      <li key={index} className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-md flex-shrink-0 bg-[${categoriesColor[item.relationship_type]}]`}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-[#6B5748] font-medium">{item.relationship_type == "null" ? "No relationship type" : item.relationship_type}</span>
                      </li>                      
                    );
                  }
                )}
              </ul>
          </div>)}
        </div>
      }
      {
        currentPage === "Manage" && (
        <div>
          {tab === "Themes" &&  (
          <div>
            <h2 className="mt-8 mb-4 text-2xl font-serif italic">
              Themes
            </h2>        
            <div className="bg-white p-4">
                <div className="space-y-4">
                  {nodes.map((item, index) => (
                    <div
                      key={index}
                      className="h-[400px] border rounded-md p-4 flex gap-6 relative"
                    >
                      {/* Checkbox */}
                      <label className="pt-1">
                        <input
                          type="checkbox"
                          defaultChecked
                          onChange={() => handleThemesChange(item.id)}                            
                          className="
                            h-4
                            w-4
                            cursor-pointer
                            accent-black
                          "
                        />
                      </label>

                      {/* Left Content */}
                      <div className="flex-1">
                        <h2 className="font-semibold text-sm mb-2">{item.name ||  "No theme provided"}</h2>

                        <p className="text-[11px] text-gray-700 max-w-[320px] leading-4">
                            {item.summary || "No summary available for this theme."}
                        </p>

                        <p className="text-[10px] mt-3 font-medium text-gray-800">
                          {(item?.photo_urls?.length ?? item?.contributions ?? 0)} tagged photo{(item?.photo_urls?.length ?? item?.contributions ?? 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="w-[240px] h-full overflow-y-auto rounded-sm bg-transparent lg:w-[430px]">
                        <div className="space-y-4 pr-2">
                          {(item?.photo_urls?.length ? item.photo_urls : []).slice(0, 4).map((photoUrl, photoIndex) => (
                            <div key={`${item.id}-photo-${photoIndex}`} className="h-[160px] overflow-hidden rounded bg-[#dddddd]">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                          ))}
                          {!item?.photo_urls?.length ? (
                            <p className="text-[11px] text-gray-500 py-8 text-center">No photos matched this theme yet.</p>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>      
            </div>      
          )}  
          {tab === "Relationships" &&  (  
            <div>
              <h2 className="mt-8 mb-4 text-2xl font-serif italic">
                Relationships
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                {/* Filter */}
                <div className="rounded border border-gray-300 bg-white p-4">
                  <p className="mb-4 text-sm">Filter</p>

                  <div className="space-y-4 text-sm">
                  {
                    relationshipCounts.map((item, index) => {
                      return (
                      <label key={index} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          defaultChecked                      
                          onChange={() => handleRelationshipTypesChange(item.relationship_type)}                        
                          className="
                            h-4
                            w-4
                            cursor-pointer
                            accent-black
                          "
                        />
                        <span>{item.count} {item.relationship_type == "null" ? "No relationship type" : item.relationship_type}</span>
                      </label>
                      );
                    }
                    )
                  }                
                  </div>
                </div>

                {/* Relationship Cards — one node per contributor */}
                <div className="space-y-4">
                  {!contributor?.length ? (
                    <div className="rounded border border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-600">
                      No contributors yet. Each person who completes the invite link will appear here
                      with the relationship they selected in the questionnaire.
                    </div>
                  ) : (
                    contributor.map((item) => {
                      const isHidden = hiddenContributors[item.id];
                      const relationshipLabel =
                        item.relationship_type == null || item.relationship_type === undefined
                          ? 'No relationship type'
                          : capitalizeFirstLetter(item.relationship_type);

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded border border-gray-300 bg-white px-6 py-5"
                        >
                          <div className="flex items-center gap-6">
                            <button type="button" className="cursor-pointer" onClick={() => toggleEye(item.id)}>
                              {isHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            <div className="h-20 w-20 rounded-full bg-[#d9d9d9]" />

                            <div className="min-w-0 flex-1">
                              <h3 className="font-serif text-lg italic">{item.name || 'Contributor'}</h3>

                              <p className="text-xs text-gray-500">
                                {item.status === 'submitted' ? 'Submitted' : 'In progress'}
                              </p>

                              <button type="button" className="mt-3 rounded bg-[#d9d9d9] px-6 py-1 text-xs">
                                {relationshipLabel}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            )}
        </div>
        )
      }
    </div>
  ) ;
}
