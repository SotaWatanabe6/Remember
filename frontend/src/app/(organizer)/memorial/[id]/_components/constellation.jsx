"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function ConstellationGraph({ memorial }) {
 const ref = useRef(null);
 
  useEffect(() => {
    const width = 800;
    const height = 600;
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
        d3.forceLink(links).id((d) => d.id).distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#000000")
      .attr("stroke-width", d => d.weight || 1)
      .attr("stroke-dasharray", d => edgeStyle(d.relationship_type));

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d=> d.prominence * 100 + 5) // size based on prominence
      .attr("fill", "#ffffff")
      .attr("stroke", "#1a1a1a")
      .call(
        d3.drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      );

    const label = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text((d) => d.id)
    .attr("font-size", 12)
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

  return <svg ref={ref} ></svg>;
}