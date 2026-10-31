import type { DemoLink, DemoNode, RouteEvaluation } from './types';

function buildAdjacency(links: DemoLink[], nodes: DemoNode[], disabledNodeIds: Set<string>) {
  const adjacency = new Map<string, Array<{ to: string; weight: number; link: DemoLink }>>();

  for (const node of nodes) {
    if (!node.available || disabledNodeIds.has(node.id)) {
      continue;
    }
    adjacency.set(node.id, []);
  }

  for (const link of links) {
    if (!link.available) {
      continue;
    }

    const sourceAvailable = nodes.find((node) => node.id === link.source)?.available && !disabledNodeIds.has(link.source);
    const targetAvailable = nodes.find((node) => node.id === link.target)?.available && !disabledNodeIds.has(link.target);

    if (!sourceAvailable || !targetAvailable) {
      continue;
    }

    const baseWeight = link.latency + (link.congestion / 100) * 8;
    const weight = Number((baseWeight).toFixed(2));

    const sourceList = adjacency.get(link.source) ?? [];
    sourceList.push({ to: link.target, weight, link });
    adjacency.set(link.source, sourceList);
  }

  return adjacency;
}

export function enumerateRoutes(links: DemoLink[], nodes: DemoNode[], start: string, end: string, disabledNodeIds: Set<string> = new Set()): string[][] {
  const adjacency = buildAdjacency(links, nodes, disabledNodeIds);
  const results: string[][] = [];

  function dfs(current: string, path: string[], visited: Set<string>) {
    if (current === end) {
      results.push([...path]);
      return;
    }

    const currentNeighbors = adjacency.get(current) ?? [];
    for (const neighbor of currentNeighbors) {
      if (visited.has(neighbor.to)) continue;
      visited.add(neighbor.to);
      path.push(neighbor.to);
      dfs(neighbor.to, path, visited);
      path.pop();
      visited.delete(neighbor.to);
    }
  }

  dfs(start, [start], new Set([start]));
  return results.filter((route) => route[route.length - 1] === end).sort((left, right) => left.length - right.length);
}

export function computeShortestRoute(
  links: DemoLink[],
  nodes: DemoNode[],
  start: string,
  end: string,
  congestionPenalty: number,
  disabledNodeIds: Set<string> = new Set(),
): RouteEvaluation | null {
  const adjacency = buildAdjacency(links, nodes, disabledNodeIds);
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const queue: Array<{ node: string; distance: number }> = [{ node: start, distance: 0 }];

  distances.set(start, 0);
  previous.set(start, null);

  while (queue.length > 0) {
    queue.sort((left, right) => left.distance - right.distance);
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.node)) continue;

    visited.add(current.node);

    for (const edge of adjacency.get(current.node) ?? []) {
      const congestionPenaltyFactor = Math.max(0, edge.link.congestion / 100) * congestionPenalty;
      const totalCost = current.distance + edge.link.latency + congestionPenaltyFactor;
      const nextDistance = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;

      if (totalCost < nextDistance) {
        distances.set(edge.to, totalCost);
        previous.set(edge.to, current.node);
        queue.push({ node: edge.to, distance: totalCost });
      }
    }
  }

  if (!distances.has(end)) {
    return null;
  }

  const path: string[] = [];
  let cursor: string | null = end;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  const totalLatency = Number((distances.get(end) ?? 0).toFixed(2));

  return {
    path,
    totalLatency,
    cost: totalLatency,
  };
}
