// Design layer feature implementation

import { createElement, injectStyles, generateId } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact, ArtifactType } from "../interaction/types";
import type {
  DesignLayerConfig,
  DesignBlob,
  BlobBounds,
  BlobStyle,
} from "./types";
import { BLOB_STYLES, BLOB_MERGE_GROUPS } from "./types";
import designStyles from "./design.css?inline";

let isInitialized = false;
let config: DesignLayerConfig;
let designLayer: HTMLDivElement | null = null;
let svgElement: SVGSVGElement | null = null;
let blobs: DesignBlob[] = [];
let cleanupFunctions: CleanupFunction[] = [];

const DESIGN_LAYER_ID = "adventure-time-design-layer";
const DESIGN_STYLES_ID = "adventure-time-design-styles";

// Blob generation parameters
const BLOB_PADDING = 60; // Padding around artifacts
const BLOB_MIN_SIZE = 80; // Minimum blob size
const BLOB_IRREGULARITY = 0.3; // How irregular the blob shape is (0-1)
const BLOB_POINTS = 8; // Number of points for blob shape

export function initDesignLayer(
  featureConfig: DesignLayerConfig,
  worldContainer: HTMLElement,
  getArtifacts: () => Artifact[]
): void {
  if (isInitialized) {
    console.warn("Design layer already initialized");
    return;
  }

  config = { debug: false, ...featureConfig };

  if (!config.enabled) {
    return;
  }

  // Inject design layer styles from CSS module
  const styleCleanup = injectStyles(designStyles, DESIGN_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create the design layer
  designLayer = createDesignLayer();
  svgElement = createSvgElement();
  designLayer.appendChild(svgElement);

  // Insert design layer as first child of world container (below interaction layer)
  worldContainer.insertBefore(designLayer, worldContainer.firstChild);

  cleanupFunctions.push(() => {
    designLayer?.remove();
  });

  // Generate blobs based on artifacts
  const artifacts = getArtifacts();
  generateBlobs(artifacts);

  isInitialized = true;

  if (config.debug) {
    console.log("Design layer initialized", {
      config,
      blobCount: blobs.length,
    });
  }
}

export function destroyDesignLayer(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  designLayer = null;
  svgElement = null;
  blobs = [];
  isInitialized = false;
}

export function getDesignLayer(): HTMLDivElement | null {
  return designLayer;
}

export function getBlobs(): DesignBlob[] {
  return [...blobs];
}

/**
 * Regenerates blobs based on current artifacts
 */
export function regenerateBlobs(artifacts: Artifact[]): void {
  if (!svgElement) return;

  // Clear existing blobs
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }
  blobs = [];

  // Regenerate
  generateBlobs(artifacts);

  if (config.debug) {
    console.log("Blobs regenerated", { blobCount: blobs.length });
  }
}

function createDesignLayer(): HTMLDivElement {
  const layer = createElement(
    "div",
    { id: DESIGN_LAYER_ID, class: "at-design-layer" },
    {}
  );

  // Set background color from config if provided
  if (config.backgroundColor) {
    layer.style.setProperty("--at-background-color", config.backgroundColor);
  }

  return layer;
}

function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "at-design-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  // Add pattern definitions
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = getPatternDefinitions();
  svg.appendChild(defs);

  return svg;
}

/**
 * Generates blobs around artifacts, grouping and merging as needed
 */
function generateBlobs(artifacts: Artifact[]): void {
  if (!svgElement) return;

  // First, render direction connecting lines (below blobs)
  const directionArtifacts = artifacts.filter((a) => a.type === "direction");
  if (directionArtifacts.length > 1) {
    renderDirectionConnections(directionArtifacts);
  }

  // Group artifacts by their blob style (considering merge groups)
  const artifactGroups = groupArtifactsByBlobStyle(artifacts);

  // For each group, create blobs and merge overlapping ones
  for (const [groupKey, groupArtifacts] of Object.entries(artifactGroups)) {
    if (groupArtifacts.length === 0) continue;

    const style = getBlobStyleForGroup(groupKey);
    if (!style) continue;

    // Create initial bounds for each artifact
    const artifactBounds = groupArtifacts.map((artifact) => ({
      artifact,
      bounds: getArtifactBlobBounds(artifact),
    }));

    // Merge overlapping bounds
    const mergedBounds = mergeOverlappingBounds(artifactBounds);

    // Create blobs for each merged region
    for (const merged of mergedBounds) {
      const blob = createBlob(
        merged.bounds,
        style,
        merged.artifactIds,
        groupKey as ArtifactType
      );
      blobs.push(blob);
      renderBlob(blob);
    }
  }
}

/**
 * Renders connecting lines between all direction artifacts
 * Creates a fluent path that connects all direction icons
 */
function renderDirectionConnections(directionArtifacts: Artifact[]): void {
  if (!svgElement || directionArtifacts.length < 2) return;

  // Get positions of all direction artifacts
  const positions = directionArtifacts.map((artifact) => {
    const rect = artifact.iconElement.getBoundingClientRect();
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return {
      x: rect.left + scrollLeft + rect.width / 2,
      y: rect.top + scrollTop + rect.height / 2,
    };
  });

  // Sort positions to create a more logical path (by Y then X)
  positions.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 50) return yDiff;
    return a.x - b.x;
  });

  // Create a smooth path through all points
  const pathData = createFluentPath(positions);

  // Create the path element
  const pathGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  pathGroup.setAttribute("class", "at-direction-connections");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#4a4a4a"); // Dark gray
  path.setAttribute("stroke-width", "4");
  path.setAttribute("stroke-dasharray", "12 8"); // Dashed line
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  pathGroup.appendChild(path);
  svgElement.appendChild(pathGroup);
}

/**
 * Creates a fluent curved path through multiple points
 * The path passes through ALL points, not just endpoints
 */
function createFluentPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  const path: string[] = [];

  // Start at first point
  path.push(`M ${points[0].x} ${points[0].y}`);

  if (points.length === 2) {
    // Simple line for two points
    path.push(`L ${points[1].x} ${points[1].y}`);
  } else {
    // Use Catmull-Rom spline converted to bezier for smooth path through ALL points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom to Bezier conversion
      const tension = 0.5;
      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

      path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
  }

  return path.join(" ");
}

/**
 * Groups artifacts by their blob style, considering merge groups
 */
function groupArtifactsByBlobStyle(
  artifacts: Artifact[]
): Record<string, Artifact[]> {
  const groups: Record<string, Artifact[]> = {};

  for (const artifact of artifacts) {
    // Check if this artifact type has a blob style
    if (!BLOB_STYLES[artifact.type]) continue;

    // Find if this type belongs to a merge group
    let groupKey = artifact.type as string;
    for (const mergeGroup of BLOB_MERGE_GROUPS) {
      if (mergeGroup.includes(artifact.type)) {
        groupKey = mergeGroup.join("-");
        break;
      }
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(artifact);
  }

  return groups;
}

/**
 * Gets the blob style for a group key
 */
function getBlobStyleForGroup(groupKey: string): BlobStyle | null {
  // If it's a merged group, use the first type's style
  const types = groupKey.split("-") as ArtifactType[];
  for (const type of types) {
    if (BLOB_STYLES[type]) {
      return BLOB_STYLES[type]!;
    }
  }
  return null;
}

/**
 * Gets the bounds for a blob around an artifact
 */
function getArtifactBlobBounds(artifact: Artifact): BlobBounds {
  const rect = artifact.sourceElement.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Add padding and ensure minimum size
  const width = Math.max(rect.width + BLOB_PADDING * 2, BLOB_MIN_SIZE);
  const height = Math.max(rect.height + BLOB_PADDING * 2, BLOB_MIN_SIZE);

  return {
    x:
      rect.left +
      scrollLeft -
      BLOB_PADDING +
      (rect.width - width + BLOB_PADDING * 2) / 2,
    y:
      rect.top +
      scrollTop -
      BLOB_PADDING +
      (rect.height - height + BLOB_PADDING * 2) / 2,
    width,
    height,
  };
}

interface ArtifactWithBounds {
  artifact: Artifact;
  bounds: BlobBounds;
}

interface MergedBounds {
  bounds: BlobBounds;
  artifactIds: string[];
}

/**
 * Merges overlapping bounds into larger regions
 */
function mergeOverlappingBounds(
  artifactBounds: ArtifactWithBounds[]
): MergedBounds[] {
  if (artifactBounds.length === 0) return [];

  // Use a simple union-find approach
  const merged: MergedBounds[] = [];
  const used = new Set<number>();

  for (let i = 0; i < artifactBounds.length; i++) {
    if (used.has(i)) continue;

    // Start a new merged region
    let currentBounds = { ...artifactBounds[i].bounds };
    const artifactIds = [artifactBounds[i].artifact.id];
    used.add(i);

    // Keep expanding until no more overlaps
    let foundOverlap = true;
    while (foundOverlap) {
      foundOverlap = false;
      for (let j = 0; j < artifactBounds.length; j++) {
        if (used.has(j)) continue;

        if (boundsOverlap(currentBounds, artifactBounds[j].bounds)) {
          currentBounds = unionBounds(currentBounds, artifactBounds[j].bounds);
          artifactIds.push(artifactBounds[j].artifact.id);
          used.add(j);
          foundOverlap = true;
        }
      }
    }

    merged.push({ bounds: currentBounds, artifactIds });
  }

  return merged;
}

/**
 * Checks if two bounds overlap (with some tolerance for near-overlaps)
 */
function boundsOverlap(a: BlobBounds, b: BlobBounds): boolean {
  const tolerance = BLOB_PADDING / 2; // Allow nearby blobs to merge
  return !(
    a.x + a.width + tolerance < b.x ||
    b.x + b.width + tolerance < a.x ||
    a.y + a.height + tolerance < b.y ||
    b.y + b.height + tolerance < a.y
  );
}

/**
 * Creates a union of two bounds
 */
function unionBounds(a: BlobBounds, b: BlobBounds): BlobBounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

/**
 * Creates a blob with an organic shape
 */
function createBlob(
  bounds: BlobBounds,
  style: BlobStyle,
  artifactIds: string[],
  artifactType: ArtifactType
): DesignBlob {
  const path = generateBlobPath(bounds);

  return {
    id: generateId("blob"),
    artifactType,
    path,
    bounds,
    style,
    artifactIds,
  };
}

/**
 * Generates an organic blob path using bezier curves
 */
function generateBlobPath(bounds: BlobBounds): string {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;

  const points: { x: number; y: number }[] = [];

  // Generate points around the ellipse with irregularity
  for (let i = 0; i < BLOB_POINTS; i++) {
    const angle = (i / BLOB_POINTS) * Math.PI * 2;
    const irregularity = 1 + (Math.random() - 0.5) * BLOB_IRREGULARITY * 2;

    points.push({
      x: centerX + Math.cos(angle) * radiusX * irregularity,
      y: centerY + Math.sin(angle) * radiusY * irregularity,
    });
  }

  // Create smooth bezier path through points
  return createSmoothPath(points);
}

/**
 * Creates a smooth closed path through points using bezier curves
 */
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return "";

  const path: string[] = [];
  const n = points.length;

  // Start at first point
  path.push(`M ${points[0].x} ${points[0].y}`);

  // Create bezier curves through all points
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    // Calculate control points using Catmull-Rom to Bezier conversion
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  path.push("Z");
  return path.join(" ");
}

/**
 * Renders a blob to the SVG
 */
function renderBlob(blob: DesignBlob): void {
  if (!svgElement) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", `at-blob at-blob-${blob.artifactType}`);
  group.setAttribute("data-blob-id", blob.id);

  // Create the blob shape with pattern fill
  const blobPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  blobPath.setAttribute("d", blob.path);
  blobPath.setAttribute("class", "at-blob-fill");

  // Apply pattern or solid fill
  if (blob.style.pattern && blob.style.pattern !== "none") {
    blobPath.setAttribute(
      "fill",
      `url(#pattern-${blob.style.pattern}-${blob.artifactType})`
    );
  } else {
    blobPath.setAttribute("fill", blob.style.color);
  }

  // Create border
  const borderPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  borderPath.setAttribute("d", blob.path);
  borderPath.setAttribute("class", "at-blob-border");
  borderPath.setAttribute("fill", "none");
  borderPath.setAttribute("stroke", blob.style.borderColor);
  borderPath.setAttribute("stroke-width", "3");
  borderPath.setAttribute("stroke-dasharray", "6 4"); // Dotted border

  group.appendChild(blobPath);
  group.appendChild(borderPath);
  svgElement.appendChild(group);

  // Add pattern definition for this specific blob if needed
  if (blob.style.pattern && blob.style.pattern !== "none") {
    addPatternForBlob(blob);
  }
}

/**
 * Adds a pattern definition for a specific blob
 */
function addPatternForBlob(blob: DesignBlob): void {
  if (!svgElement) return;

  const defs = svgElement.querySelector("defs");
  if (!defs) return;

  const patternId = `pattern-${blob.style.pattern}-${blob.artifactType}`;

  // Check if pattern already exists
  if (defs.querySelector(`#${patternId}`)) return;

  const pattern = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "pattern"
  );
  pattern.setAttribute("id", patternId);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");

  switch (blob.style.pattern) {
    case "triangles":
      pattern.setAttribute("width", "30");
      pattern.setAttribute("height", "30");
      pattern.innerHTML = `
        <rect width="30" height="30" fill="${blob.style.color}"/>
        <polygon points="15,5 25,25 5,25" fill="${blob.style.borderColor}" opacity="0.3"/>
      `;
      break;

    case "circles":
      pattern.setAttribute("width", "20");
      pattern.setAttribute("height", "20");
      pattern.innerHTML = `
        <rect width="20" height="20" fill="${blob.style.color}"/>
        <circle cx="10" cy="10" r="4" fill="${blob.style.borderColor}" opacity="0.3"/>
      `;
      break;

    case "waves":
      pattern.setAttribute("width", "40");
      pattern.setAttribute("height", "20");
      pattern.innerHTML = `
        <rect width="40" height="20" fill="${blob.style.color}"/>
        <path d="M0 10 Q10 5, 20 10 T40 10" stroke="${blob.style.borderColor}" stroke-width="2" fill="none" opacity="0.3"/>
      `;
      break;

    case "diamonds":
      pattern.setAttribute("width", "24");
      pattern.setAttribute("height", "24");
      pattern.innerHTML = `
        <rect width="24" height="24" fill="${blob.style.color}"/>
        <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="${blob.style.borderColor}" stroke-width="1.5" opacity="0.3"/>
      `;
      break;
  }

  defs.appendChild(pattern);
}

/**
 * Gets SVG pattern definitions
 */
function getPatternDefinitions(): string {
  return `
    <!-- Dotted background pattern -->
    <pattern id="dotted-bg" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="4" cy="4" r="1" fill="currentColor" opacity="0.3"/>
    </pattern>
  `;
}
