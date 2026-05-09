#!/usr/bin/env bun
/**
 * derp2mihomo.ts
 * Fetches Tailscale DERP map and converts all IPv4/IPv6 addresses
 * into a mihomo ruleset YAML (payload: format) printed to stdout.
 *
 * Usage:
 *   bun derp2mihomo.ts
 */

const DERP_URL = "https://login.tailscale.com/derpmap/default";

interface DerpNode {
  Name: string;
  RegionID: number;
  HostName: string;
  IPv4?: string;
  IPv6?: string;
  [key: string]: unknown;
}

interface DerpRegion {
  RegionID: number;
  RegionCode: string;
  RegionName: string;
  Nodes: DerpNode[];
  [key: string]: unknown;
}

interface DerpMap {
  Regions: Record<string, DerpRegion>;
  [key: string]: unknown;
}

const res = await fetch(DERP_URL);
if (!res.ok) {
  console.error(`Failed to fetch DERP map: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const data: DerpMap = await res.json();
const regions = Object.values(data.Regions ?? {}).sort(
  (a, b) => a.RegionID - b.RegionID
);

const lines: string[] = ["payload:"];

for (const region of regions) {
  for (const node of region.Nodes ?? []) {
    if (node.IPv4 && node.IPv4 !== "none") {
      lines.push(`- IP-CIDR,${node.IPv4}/32,no-resolve # ${node.HostName}`);
    }
  }
}

for (const region of regions) {
  for (const node of region.Nodes ?? []) {
    if (node.IPv6 && node.IPv6 !== "none") {
      const addr = node.IPv6.replace(/^\[|\]$/g, "");
      lines.push(`- IP-CIDR6,${addr}/128,no-resolve # ${node.HostName}`);
    }
  }
}

process.stdout.write(lines.join("\n") + "\n");
