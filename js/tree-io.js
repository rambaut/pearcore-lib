/**
 * tree-io.js — Tree import helpers built on pearcore tree-graph utilities.
 */

import { extractNewick, parseNewickTree, walkTree, valuePreview } from './tree-graph.js';

/**
 * Inspect a tree file for BEAST-style annotations and likely field mappings.
 */
export function analyzeTreeAnnotations(text) {
  const newick = extractNewick(text);
  const root = parseNewickTree(newick);
  const samplesByKey = {};
  const keyOrder = [];

  walkTree(root, node => {
    for (const [k, v] of Object.entries(node.annotations || {})) {
      if (!samplesByKey[k]) {
        samplesByKey[k] = [];
        keyOrder.push(k);
      }
      if (samplesByKey[k].length < 3) samplesByKey[k].push(valuePreview(v));
    }
  });

  const annotationKeys = keyOrder;
  const suggested = {
    longitudeKey: bestKey(annotationKeys, [/\blon\b/i, /\blng\b/i, /long/i, /longitude/i, /coord.?x/i]),
    latitudeKey: bestKey(annotationKeys, [/\blat\b/i, /latitude/i, /coord.?y/i]),
    hpdKey: bestKey(annotationKeys, [/95.?%.*hpd/i, /hpd/i, /polygon/i, /shape/i, /region/i]),
    locationKey: bestKey(annotationKeys, [/location/i, /state/i, /trait/i, /deme/i, /region/i]),
    posteriorKey: bestKey(annotationKeys, [/posterior/i, /prob/i, /density/i, /vector/i, /set.*prob/i]),
  };

  return {
    hasBeastAnnotations: annotationKeys.length > 0,
    annotationKeys,
    samplesByKey,
    suggested,
    likelyContinuous: !!(suggested.longitudeKey && suggested.latitudeKey),
    likelyDiscrete: !!(suggested.locationKey || suggested.posteriorKey),
  };
}

/**
 * Parse Newick/Nexus text into renderable tree layer data using user field mappings.
 */
export function parseTreeData(text, mapping = {}) {
  const newick = extractNewick(text);
  const root = parseNewickTree(newick);

  const nodes = [];
  const branches = [];
  const hpdRegions = [];
  let nodeSeq = 0;

  function visit(node) {
    nodeSeq += 1;
    const nodeId = `n${nodeSeq}`;

    const lon = coerceNumber(node.annotations?.[mapping.longitudeKey]);
    const lat = coerceNumber(node.annotations?.[mapping.latitudeKey]);
    const hasCoord = Number.isFinite(lon) && Number.isFinite(lat);

    if (hasCoord) {
      nodes.push({
        id: nodeId,
        longitude: lon,
        latitude: lat,
        label: node.name || '',
        location: mapping.locationKey ? node.annotations?.[mapping.locationKey] ?? null : null,
        posterior: mapping.posteriorKey ? node.annotations?.[mapping.posteriorKey] ?? null : null,
      });
    }

    if (mapping.hpdKey) {
      const hpdValue = node.annotations?.[mapping.hpdKey];
      const polygon = extractPolygon(hpdValue);
      if (polygon) {
        hpdRegions.push({ nodeId, coordinates: polygon, sourceKey: mapping.hpdKey });
      }
    }

    for (const child of node.children || []) {
      const childInfo = visit(child);
      if (hasCoord && childInfo.hasCoord) {
        branches.push({
          startLon: lon,
          startLat: lat,
          endLon: childInfo.lon,
          endLat: childInfo.lat,
          sourceNode: nodeId,
          targetNode: childInfo.nodeId,
        });
      }
    }

    return { nodeId, lon, lat, hasCoord };
  }

  visit(root);

  return {
    nodes,
    branches,
    hpdRegions,
    metadata: {
      mapping,
      nodeCount: nodes.length,
      branchCount: branches.length,
      hasDiscreteStates: !!mapping.locationKey,
      hasPosteriorDensity: !!mapping.posteriorKey,
      hasHPD: !!mapping.hpdKey,
    },
  };
}

function bestKey(keys, patterns) {
  for (const p of patterns) {
    const hit = keys.find(k => p.test(k));
    if (hit) return hit;
  }
  return '';
}

function coerceNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (Array.isArray(v) && v.length === 1) return coerceNumber(v[0]);
  return null;
}

function extractPolygon(v) {
  const pairs = [];

  function walk(x) {
    if (Array.isArray(x)) {
      if (x.length === 2) {
        const a = coerceNumber(x[0]);
        const b = coerceNumber(x[1]);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          pairs.push([a, b]);
          return;
        }
      }
      for (const y of x) walk(y);
    }
  }

  walk(v);
  return pairs.length >= 3 ? pairs : null;
}
