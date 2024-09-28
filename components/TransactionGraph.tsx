// components/TransactionGraph.tsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Block } from "../lib/chain"; // Import your Block interface

interface Props {
  chain: Block[];
}

const TransactionGraph: React.FC<Props> = ({ chain }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (chain.length === 0) return;

    const width = 1000;
    const height = 800;

    const nodes = Array.from(
      new Set(chain.flatMap(({ sender, receiver }) => [sender, receiver]))
    ).map((id) => ({ id }));

    const links = chain.map(({ sender, receiver, amount }) => ({
      source: sender,
      target: receiver,
      amount,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", (d) => Math.sqrt(d.amount))
      .style("stroke", "#999");

    link.append("title").text((d) => `${d.amount}`);

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .style("fill", "#69b3a2")
      .call(
        d3
          .drag()
          .on("start", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.append("title").text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as any).x)
        .attr("y1", (d) => (d.source as any).y)
        .attr("x2", (d) => (d.target as any).x)
        .attr("y2", (d) => (d.target as any).y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);-
    });
  }, [chain]);

  return <svg ref={svgRef} width="800" height="600" />;
};

export default TransactionGraph;
