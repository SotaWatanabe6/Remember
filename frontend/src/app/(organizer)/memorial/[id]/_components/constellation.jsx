"use client";

import { useEffect, useRef,useState } from "react";
import * as d3 from "d3";

export default function ConstellationGraph({ memorial }) {
 const ref = useRef(null);
const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const width = 800;
    const height = 800;
    console.log("Memorial data for graph:", memorial.constellation); // Debugging line
    // const nodes = [
    //   { id: "A" },
    //   { id: "B" },
    //   { id: "C" },
    //   { id: "D" },
    // ];
    const nodes = memorial.constellation.nodes.map(t => ({
      id: t.id,
      name: t.label,          // common for display
      group: t.category,      // useful for coloring / clustering
      prominence: t.prominence_score,
      summary: t.summary,
      photos: t.photo_ids,
      quotes: t.quotes
    }));    

    // const links = [
    //   { source: "A", target: "B" },
    //   { source: "A", target: "C" },
    //   { source: "B", target: "D" },
    // ];
    const links = memorial.constellation.edges.map(d => ({
      source: d.source,
      target: d.target,
      type: d.relationship_type,
      weight: d.weight
    })); 
    
    const edgeStyle = (type) => {
      switch (type) {
        case "family":
          return ""; // solid
        case "friend":
          return "6,4"; // dashed
        case "colleague":
          return "2,4"; // dotted
        case "community":
          return "10,4,2,4"; // long-dash pattern
        default:
          return "";
      }
    };

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id).distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(100));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#000000")
      .attr("stroke-width", d => d.weight || 1)
      .attr("stroke-dasharray", d => edgeStyle(d.type));

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
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

    const label = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text((d) => d.name || " No theme ")
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
  }, []);

  return (
    <div>
      <svg ref={ref} ></svg>    
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
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
                  {selectedNode.summary}
                </div>
              </div>

              {/* QUOTES */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Quotes & Memories
                </h3>

                <div className="space-y-4">
                  {selectedNode.quotes.map((quote, index) => (
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
              {selectedNode.quotes.length === 0 && (
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