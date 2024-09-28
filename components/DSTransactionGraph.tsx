import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Block } from "../lib/chain";

interface Props {
  chain: Block[];
}

const DSTransactionGraph: React.FC<Props> = ({ chain }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (chain.length === 0) return;

    const width = 1000;
    const height = 1000;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const nodes = Array.from(
      new Set(
        chain.flatMap(({ senderId, receiverId }) => [senderId, receiverId])
      )
    ).map((id) => ({ id }));

    const links = chain.map(({ senderId, receiverId, amount }) => ({
      source: senderId,
      target: receiverId,
      amount,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id)
      )
      .force("charge", d3.forceManyBody())
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.amount));

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => color(d.group));

    node.append("title").text((d) => `NAME : ${d.id}`);

    link.append("title").text((d) => `AMOUNT : ${d.amount}`);
    // Add a drag behavior.

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    node.call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

    // Set the position attributes of links and nodes each time the simulation ticks.
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x * 3 + 400)
        .attr("y1", (d) => d.source.y * 3 + 200)
        .attr("x2", (d) => d.target.x * 3 + 400)
        .attr("y2", (d) => d.target.y * 3 + 200);

      node.attr("cx", (d) => d.x * 3 + 400).attr("cy", (d) => d.y * 3 + 200);

      node.call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );
    });
  }, [chain]);

  return <svg ref={svgRef} width="1200" height="1200" className="pt-20" />;
};

export default DSTransactionGraph;
