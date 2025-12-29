// SVG Icon System
// Minimalistic, consistent stroke-based icons with theming support

import type { IconName, IconTheme } from "./types";
import { DEFAULT_ICON_THEME } from "./types";

let currentTheme: IconTheme = { ...DEFAULT_ICON_THEME };

/**
 * Set the icon theme
 */
export function setIconTheme(theme: Partial<IconTheme>): void {
  currentTheme = { ...DEFAULT_ICON_THEME, ...theme };
}

/**
 * Get the current icon theme
 */
export function getIconTheme(): IconTheme {
  return currentTheme;
}

/**
 * Get the color for a specific icon
 */
function getIconColor(name: IconName): string {
  const theme = currentTheme;

  switch (name) {
    case "portal":
      return theme.portalColor || theme.accentColor;
    case "paper":
      return theme.paperColor || theme.accentColor;
    case "direction":
      return theme.directionColor || theme.accentColor;
    case "diamond":
      return theme.diamondColor || theme.accentColor;
    case "silver":
      return theme.silverColor || theme.accentColor;
    case "gold":
      return theme.goldColor || theme.accentColor;
    case "intro":
      return theme.introColor || theme.accentColor;
    case "dimensional":
      return theme.dimensionalColor || theme.accentColor;
    case "ghost":
      return theme.ghostColor || theme.accentColor;
    case "inventory":
    case "realms":
    case "close":
    case "arrow":
    case "navigation":
    case "pulse":
      return theme.uiAccentColor || theme.accentColor;
    case "avatar":
      return theme.avatarColor || "#4CAF50";
    default:
      return theme.accentColor;
  }
}

/**
 * SVG icon definitions - minimalistic outline style
 * ViewBox is 24x24 for consistency
 */
const iconPaths: Record<IconName, (color: string, stroke: string) => string> = {
  // Portal - swirling vortex
  portal: (color, stroke) => `
    <circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="2" fill="none"/>
    <path d="M12 3c0 5-3 9-3 9s3 4 3 9" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M12 3c0 5 3 9 3 9s-3 4-3 9" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2" fill="${color}"/>
  `,

  // Paper - scroll/document
  paper: (color, stroke) => `
    <path d="M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="${stroke}" stroke-width="2" fill="none"/>
    <path d="M14 4v4h4" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="14" y2="12" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <line x1="8" y1="16" x2="12" y2="16" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  `,

  // Direction - signpost
  direction: (color, stroke) => `
    <line x1="12" y1="3" x2="12" y2="21" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    <polygon points="6,7 18,7 20,10 18,13 6,13" stroke="${stroke}" stroke-width="2" fill="${color}" fill-opacity="0.3"/>
    <line x1="8" y1="10" x2="16" y2="10" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  `,

  // Diamond - gem/crystal
  diamond: (color, stroke) => `
    <polygon points="12,2 22,9 12,22 2,9" stroke="${stroke}" stroke-width="2" fill="none"/>
    <line x1="2" y1="9" x2="22" y2="9" stroke="${stroke}" stroke-width="2"/>
    <line x1="12" y1="2" x2="8" y2="9" stroke="${color}" stroke-width="1.5"/>
    <line x1="12" y1="2" x2="16" y2="9" stroke="${color}" stroke-width="1.5"/>
    <line x1="8" y1="9" x2="12" y2="22" stroke="${color}" stroke-width="1.5"/>
    <line x1="16" y1="9" x2="12" y2="22" stroke="${color}" stroke-width="1.5"/>
  `,

  // Silver - coin
  silver: (color, stroke) => `
    <circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="2" fill="none"/>
    <circle cx="12" cy="12" r="6" stroke="${color}" stroke-width="1.5" fill="none"/>
    <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="${stroke}">S</text>
  `,

  // Gold - treasure chest
  gold: (color, stroke) => `
    <rect x="3" y="10" width="18" height="10" rx="2" stroke="${stroke}" stroke-width="2" fill="none"/>
    <path d="M3 10c0-3 4-6 9-6s9 3 9 6" stroke="${stroke}" stroke-width="2" fill="none"/>
    <line x1="12" y1="10" x2="12" y2="14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="15" r="1.5" fill="${color}"/>
  `,

  // Intro - tent/camp
  intro: (color, stroke) => `
    <path d="M12 3L3 18h18L12 3z" stroke="${stroke}" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <path d="M12 3v15" stroke="${stroke}" stroke-width="2"/>
    <path d="M9 18v-5l3-2 3 2v5" stroke="${color}" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <circle cx="18" cy="6" r="1.5" fill="${color}"/>
  `,

  // Dimensional - galaxy/wormhole
  dimensional: (color, stroke) => `
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="${stroke}" stroke-width="2" fill="none" transform="rotate(-30 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="${color}" stroke-width="1.5" fill="none" transform="rotate(30 12 12)"/>
    <circle cx="12" cy="12" r="3" stroke="${stroke}" stroke-width="2" fill="${color}" fill-opacity="0.4"/>
    <circle cx="6" cy="8" r="1" fill="${color}"/>
    <circle cx="18" cy="16" r="1" fill="${color}"/>
    <circle cx="16" cy="6" r="0.8" fill="${stroke}"/>
  `,

  // Ghost - star marker
  ghost: (color, stroke) => `
    <polygon points="12,2 14.5,9 22,9 16,14 18.5,21 12,17 5.5,21 8,14 2,9 9.5,9" stroke="${stroke}" stroke-width="2" fill="${color}" fill-opacity="0.3"/>
  `,

  // Inventory - backpack
  inventory: (color, stroke) => `
    <rect x="5" y="8" width="14" height="13" rx="2" stroke="${stroke}" stroke-width="2" fill="none"/>
    <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="${stroke}" stroke-width="2" fill="none"/>
    <rect x="9" y="11" width="6" height="4" rx="1" stroke="${color}" stroke-width="1.5" fill="none"/>
    <line x1="12" y1="15" x2="12" y2="18" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Realms - map
  realms: (color, stroke) => `
    <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" stroke="${stroke}" stroke-width="2" fill="none"/>
    <line x1="9" y1="3" x2="9" y2="18" stroke="${stroke}" stroke-width="2"/>
    <line x1="15" y1="6" x2="15" y2="21" stroke="${stroke}" stroke-width="2"/>
    <circle cx="7" cy="10" r="1.5" fill="${color}"/>
    <circle cx="12" cy="13" r="1.5" fill="${color}"/>
    <circle cx="17" cy="11" r="1.5" fill="${color}"/>
  `,

  // Close - X button
  close: (color, stroke) => `
    <line x1="6" y1="6" x2="18" y2="18" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="18" y1="6" x2="6" y2="18" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
  `,

  // Arrow - selection indicator
  arrow: (color, stroke) => `
    <path d="M8 4l8 8-8 8" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,

  // Navigation - direction dot
  navigation: (color, stroke) => `
    <circle cx="12" cy="12" r="6" fill="${color}"/>
    <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2" fill="none" opacity="0.5"/>
  `,

  // Pulse - click indicator
  pulse: (color, stroke) => `
    <circle cx="12" cy="12" r="4" fill="${color}"/>
    <circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>
    <circle cx="12" cy="12" r="11" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.3"/>
  `,

  // Avatar - top-down explorer character (viewed from above)
  // Shows head/hat from above with directional indicator
  avatar: (color, stroke) => `
    <circle cx="12" cy="12" r="9" fill="${color}" stroke="${stroke}" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" fill="${stroke}" opacity="0.2"/>
    <path d="M12 3v5" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="12" cy="4" r="2" fill="${stroke}"/>
  `,
};

/**
 * Get an SVG icon as an HTML string
 * @param name Icon name
 * @param size Size in pixels (default 24)
 * @param customColor Optional custom color override
 */
export function getIconSvg(
  name: IconName,
  size: number = 24,
  customColor?: string
): string {
  const theme = currentTheme;
  const color = customColor || getIconColor(name);
  const stroke = theme.strokeColor;

  const pathFn = iconPaths[name];
  if (!pathFn) {
    console.warn(`Icon "${name}" not found`);
    return "";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="display:block;">${pathFn(
    color,
    stroke
  )}</svg>`;
}

/**
 * Create an icon element
 * @param name Icon name
 * @param size Size in pixels (default 24)
 * @param customColor Optional custom color override
 */
export function createIconElement(
  name: IconName,
  size: number = 24,
  customColor?: string
): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `at-icon at-icon-${name}`;
  span.innerHTML = getIconSvg(name, size, customColor);
  span.style.display = "inline-flex";
  span.style.alignItems = "center";
  span.style.justifyContent = "center";
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  return span;
}

/**
 * Get icon HTML for use in innerHTML
 * Wraps the SVG in a span with proper classes
 */
export function getIconHtml(
  name: IconName,
  size: number = 24,
  customColor?: string
): string {
  const svg = getIconSvg(name, size, customColor);
  return `<span class="at-icon at-icon-${name}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${svg}</span>`;
}

/**
 * Map artifact type to icon name
 */
export function getArtifactIconName(
  artifactType: string,
  isExternal?: boolean,
  isIntro?: boolean
): IconName {
  if (isIntro) return "intro";
  if (isExternal) return "dimensional";

  switch (artifactType) {
    case "portal":
      return "portal";
    case "paper":
      return "paper";
    case "direction":
      return "direction";
    case "diamond":
      return "diamond";
    case "silver":
      return "silver";
    case "gold":
      return "gold";
    default:
      return "paper";
  }
}
