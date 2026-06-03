"use client";
import { useParams } from 'next/navigation';
import { useEffect, useRef,useState } from "react";
import * as d3 from "d3";
import {
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { getContributors,getMemorial} from '@/lib/api';



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
    prominence: 0.3 + (Math.random() * 0.4),
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

export default function ConstellationGraph({ ai_output ,memorial, contributor, width, height}) {
  const ref = useRef(null);
  console.log(memorial);
  const { id } = useParams();
  const [constellationLoading, setConstellationLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tab, setTab] = useState("Themes");
  // const [hiddenItems, setHiddenItems] = useState({});
  const [hiddenContributors, setHiddenContributors] = useState({});
  const [hiddenRelationshipType, setHiddenRelationshipType] = useState({});
  const [hiddenThemes, setHiddenThemes] = useState({});  
  // const toggleEye = (id) => {
  //   setHiddenItems((prev) => ({
  //     ...prev,
  //     [id]: !prev[id],
  //   }));
    
    // Use setTimeout to allow D3 to apply smooth exit transitions
    // setTimeout(() => {
    //   const filteredNodes = nodes.filter(item => {
    //     const shouldHide = !(!prev[item.id] ? true : (prev[item.id] !== true));
    //     return !shouldHide;
    //   });
    //   console.log("Filtered Nodes: ", prev);
    //   const filteredLinks = links.filter(
    //     l => !prev[l.target.id]
    //   );
    //   setNodes(filteredNodes);
    //   setLinks(filteredLinks);
    // }, 300);
  // };
  const handleThemesChange = (nodeId) => {
    setHiddenThemes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
    
  };  

  function capitalizeFirstLetter(str) {
    if(!str || str=='null') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
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
  // const [contributor, setContributors] = useState([]);
  const [relationshipCounts, setRelationshipCounts] = useState(
    Object.entries(
      contributor.reduce((acc, item) => {
          acc[capitalizeFirstLetter(item.relationship_type)] =
            (acc[capitalizeFirstLetter(item.relationship_type)] || 0) + 1;
          return acc;
        }, {})
      ).map(([relationship_type, count]) => ({
        relationship_type: capitalizeFirstLetter(relationship_type),
        count,
      }))    
  );
  console.log(ai_output.constellation);
  const [nodes, setNodes] = useState(
      ai_output?.constellation?.nodes?.map(t => ({
        id: t.id,
        name: t.label,
        group: capitalizeFirstLetter(t.category),
        prominence: t.prominence_score,
        summary: t.summary,
        photos: t.photo_ids,
        quotes: t.quotes
      }))
  );
  const [links, setLinks] = useState(
    ai_output?.constellation?.edges?.map(d => ({
      source: d.source,
      target: d.target,
      type: capitalizeFirstLetter(d.relationship_type),
      weight: d.weight
    }))
  );
  
  
  // Generate placeholder nodes for loading state
  const placeholderNodes = [...Array(8)].map((_, i) => ({
    id: `placeholder-${i}`,
    name: `Node ${i + 1}`,
    group: 'placeholder',
    prominence: 0.3 + (Math.random() * 0.4),
    summary: '',
    photos: [],
    quotes: [],
    x: Math.random() * 600,
    y: Math.random() * 400,
  }));
  // useEffect(() => {    
  //   if (!tab) return;
  //   if (!id) return;
  // }, [tab,id]);   

  
  const handleChange = (e) => {
      setTab(e.target.value);
      if (e.target.value === "Themes") {
      // setHiddenItems(ai_output.constellation.nodes.map(t => ({
      //   [t.id]: false,
      // })));        

        setNodes(ai_output?.constellation?.nodes.map(t => ({
          id: t.id,
          name: t.label,          // common for display
          group: t.category,      // useful for coloring / clustering
          prominence: t.prominence_score,
          summary: t.summary,
          photos: t.photo_ids,
          quotes: t.quotes
        })));    
        setLinks(ai_output?.constellation?.edges.map(d => ({
          source: d.source,
          target: d.target,
          type: (d.relationship_type),
          weight: d.weight
        })));
    }
    else{
      // setHiddenItems(contributor.map(t => ({
      //   [t.id]: false,
      // })));
      setNodes(contributor.map(t => ({
        id: t.id,
        name: t.name,
        prominence: 0.7,
        summary: t.summary,
        photos: t.photo_ids,
        quotes: t.quotes        
      })));    
      if (memorial) {
        setNodes((prevItems) => [...prevItems, {
          id: memorial.user_id,
          name: memorial.subject_name,
          prominence: 1,
        }]);
      }
      setLinks(contributor.map(d => ({
        source: memorial.user_id,
        target: d.id,
        type: capitalizeFirstLetter(d.relationship_type),
        weight: d.weight
      })));         
    }
  }
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    if (!links || links.length === 0) return;
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

      displayNode=nodes.filter(
        (node) => !hiddenThemes[node.id]
      );
      displayLink=links.filter(
        (link) =>
          !hiddenThemes[link.source.id] &&
          !hiddenThemes[link.target.id]
      );
    }
    else {
      displayNode=nodes.filter(
        (node) => !hiddenRelationshipType[node.type]
      );
      displayLink=links.filter(
        (link) =>
          !hiddenRelationshipType[link.type]
      );        
      console.log("After relationship type filter - Nodes: ", displayNode);
      console.log("After relationship type filter - Links: ", displayLink);
      displayNode=displayNode.filter(item => !hiddenContributors[item.id]);
      displayLink=displayLink.filter(
        l => !hiddenContributors[l.target.id]
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

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(displayNode)
      .enter()
      .append("circle")
      .attr("r", d=> d.prominence * 80 + 5) // size based on prominence
      .attr("fill", "#ffffff")
      .attr("stroke", "#1a1a1a")
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
  }, [nodes, links, hiddenRelationshipType, hiddenContributors, hiddenThemes,tab]);

  return (
    <div>
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
      <div className="relative h-full w-full rounded-sm bg-[#d9d9d9] p-10">        
        {constellationLoading ? (
          <PulsingPlaceholder />
        ) : (
          <svg ref={ref} ></svg>
        )}
        {tab === "Relationships" &&  (
        <div className="absolute bottom-4 left-4 w-36 rounded bg-[#767676] p-3 text-white shadow-md">
            <p className="mb-3 text-sm">Legend</p>

            <div className="space-y-2 text-xs">
                {
                  relationshipCounts.map((item, index) => {
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm bg-white" />
                      <span>{item.relationship_type == "null" || item.relationship_type == undefined ? "No relationship type" : item.relationship_type}</span>
                    </div>
                  );
                }
              )}
            </div>
        </div>)}
      </div>
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
                      // checked={hiddenThemes[item.id] || true}
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
                      {item?.contributions || "No"} tagged contributions
                    </p>
                  </div>
                  <div className="w-[240px] h-full overflow-y-auto rounded-sm bg-transparent lg:w-[430px]">
                    <div className="space-y-4 pr-2">
                      <div className="h-[160px] rounded bg-[#dddddd]" />
                      <div className="h-[180px] rounded bg-[#dddddd]" />
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
                      // checked={hiddenRelationshipType[item.relationship_type]|| true}
                      className="
                        h-4
                        w-4
                        cursor-pointer
                        accent-black
                      "
                    />
                    <span>{item.count} {item.relationship_type == "null" || item.relationship_type==undefined ? "No relationship type" : item.relationship_type}</span>
                  </label>
                  );
                }
                )
              }                
              </div>
            </div>

            {/* Relationship Cards */}
            <div className="space-y-4">
              {contributor.map((item) => {

                const isHidden = hiddenContributors[item.id];
                return (

                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-gray-300 bg-white px-6 py-5"
                >
                  <div className="flex items-center gap-6">
                    <button className="cursor-pointer" onClick={() => toggleEye(item.id)}>
                      {isHidden ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>                    
                    <div className="h-20 w-20 rounded-full bg-[#d9d9d9]" />

                    <div>
                      <h3 className="font-serif text-lg italic">
                        {item.name}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {contributor.length || "No"} tagged contributions
                      </p>

                      <button className="mt-3 rounded bg-[#d9d9d9] px-6 py-1 text-xs">
                        {item.relationship_type == "null" || item.relationship_type == undefined ? "No relationship type" : item.relationship_type}
                      </button>
                    </div>
                  </div>
                </div>
                )
              })
            }
            </div>
          </div>
        </div>
        )}

        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden modal-enter">
              {/* HEADER */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-3xl font-bold capitalize text-gray-900">
                    {selectedNode.label}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
                >
                  Close
                </button>
              </div>

              {/* CONTENT */}
              <div className="max-h-[75vh] overflow-y-auto p-6">
                {/* SUMMARY */}
                <div className="mb-8">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">
                    Summary
                  </h3>

                  <div className="rounded-xl bg-gray-50 p-4 text-gray-700 leading-relaxed">
                    {selectedNode.summary || "No summary available for "+selectedNode.name}
                  </div>
                </div>

                {/* QUOTES */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Quotes & Memories
                  </h3>

                  <div className="space-y-4">
                    {selectedNode?.quotes?.map((quote, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                      >
                        <p className="text-gray-800 italic leading-relaxed">
                          {quote.text}
                        </p>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
                            {quote.relationship_type}
                          </span>

                          <span className="text-xs text-gray-400">
                            Contributor ID
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EMPTY STATE */}
                {!selectedNode?.quotes && (
                  <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                    No quotes available
                  </div>
                )}
              </div>
            </div>
          </div>
      )}    
    </div>
  ) ;
}