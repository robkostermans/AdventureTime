// Story mode feature implementation
// Terminal-style text interface for artifact interactions

import { createElement, injectStyles } from "../../core/utils";
import type { CleanupFunction } from "../../core/types";
import type { Artifact } from "../interaction/types";
import { ARTIFACT_ICONS } from "../interaction/types";
import { pauseInput, resumeInput } from "../input";
import type {
  StoryModeFeatureConfig,
  StoryState,
  StoryContent,
  StoryPhase,
} from "./types";
import {
  STORY_TYPE_LABELS,
  STORY_TAKE_VERBS,
  STORY_TAKE_RESULTS,
  STORY_LEAVE_RESULTS,
  STORY_RETURN_RESULTS,
  STORY_GHOST_LEAVE_RESULTS,
} from "./types";
import storyModeStyles from "./storymode.css?inline";

let isInitialized = false;
let config: StoryModeFeatureConfig;
let terminalElement: HTMLDivElement | null = null;
let cleanupFunctions: CleanupFunction[] = [];

// State
let state: StoryState = {
  isActive: false,
  currentArtifactId: null,
  selectedOptionIndex: 0,
  phase: "idle",
};

// Callbacks
let onTakeCallback: ((artifactId: string) => void) | null = null;
let onLeaveCallback: ((artifactId: string) => void) | null = null;
let onReturnCallback: ((artifactId: string) => void) | null = null;

// Current content being displayed
let currentContent: StoryContent | null = null;

const STORY_STYLES_ID = "adventure-time-storymode-styles";

export function initStoryMode(featureConfig: StoryModeFeatureConfig): void {
  if (isInitialized) {
    console.warn("Story mode already initialized");
    return;
  }

  config = {
    ...featureConfig,
    debug: featureConfig.debug ?? false,
    typewriterSpeed: featureConfig.typewriterSpeed ?? 50,
  };

  if (!config.enabled) {
    return;
  }

  // Inject story mode styles
  const styleCleanup = injectStyles(storyModeStyles, STORY_STYLES_ID);
  cleanupFunctions.push(styleCleanup);

  // Create terminal element
  terminalElement = createTerminalElement();
  document.body.appendChild(terminalElement);

  cleanupFunctions.push(() => {
    terminalElement?.remove();
  });

  // Setup keyboard navigation
  const keyHandler = handleKeyDown;
  document.addEventListener("keydown", keyHandler);
  cleanupFunctions.push(() => {
    document.removeEventListener("keydown", keyHandler);
  });

  isInitialized = true;

  if (config.debug) {
    console.log("Story mode initialized", config);
  }
}

export function destroyStoryMode(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];
  terminalElement = null;
  state = {
    isActive: false,
    currentArtifactId: null,
    selectedOptionIndex: 0,
    phase: "idle",
  };
  currentContent = null;
  onTakeCallback = null;
  onLeaveCallback = null;
  isInitialized = false;
}

export function isStoryModeEnabled(): boolean {
  return isInitialized && config.enabled;
}

export function isStoryModeActive(): boolean {
  return state.isActive;
}

/**
 * Handle a click event during story mode.
 * For single-choice artifacts (intro/direction), clicking dismisses immediately.
 * For multi-choice artifacts, clicking is ignored (user must use options).
 * @returns true if the click was handled (story mode is active and dismissed), false otherwise
 */
export function handleStoryModeClick(): boolean {
  if (!state.isActive || !currentContent) return false;
  
  // During result phase, ignore clicks
  if (state.phase === "result") return true; // Consume the click but don't do anything
  
  const { artifactType, isIntro } = currentContent;
  const isDirection = artifactType === "direction";
  const isSingleChoice = isIntro || isDirection;
  
  // For single-choice artifacts, clicking dismisses immediately (like pressing a movement key)
  if (isSingleChoice && (state.phase === "choice" || state.phase === "discovery")) {
    state.phase = "choice";
    confirmChoice(true); // Immediate dismiss
    return true;
  }
  
  // For multi-choice artifacts, don't handle click (let user use the options)
  // Return true to indicate story mode is active and click should not propagate
  return true;
}

/**
 * Set callbacks for take/leave/return actions
 */
export function setStoryModeCallbacks(
  onTake: (artifactId: string) => void,
  onLeave: (artifactId: string) => void,
  onReturn?: (artifactId: string) => void
): void {
  onTakeCallback = onTake;
  onLeaveCallback = onLeave;
  onReturnCallback = onReturn || null;
}

/**
 * Show story mode for an artifact
 * @param artifact - The artifact being interacted with
 * @param content - The content to display
 * @param isIntro - Whether this is the intro artifact
 * @param introText - Optional intro text
 * @param originalHref - Optional href for portals
 * @param isGhostMarker - Whether this is a ghost marker (collected artifact location)
 */
export function showStoryMode(
  artifact: Artifact,
  content: string,
  isIntro?: boolean,
  introText?: string,
  originalHref?: string,
  isGhostMarker?: boolean
): void {
  if (!terminalElement) return;

  currentContent = {
    artifactId: artifact.id,
    artifactType: artifact.type,
    icon: isGhostMarker ? "⭐" : (artifact.isIntro ? "🎪" : ARTIFACT_ICONS[artifact.type]),
    typeName: STORY_TYPE_LABELS[artifact.type],
    content,
    isIntro,
    introText,
    originalHref,
    isGhostMarker,
  };

  state = {
    isActive: true,
    currentArtifactId: artifact.id,
    selectedOptionIndex: 0,
    phase: "discovery",
  };

  // Pause movement
  pauseInput();

  // Render the terminal content
  renderTerminal();

  // Show terminal
  terminalElement.classList.add("at-story-terminal--visible");
  if (isIntro) {
    terminalElement.classList.add("at-story-terminal--intro");
  } else {
    terminalElement.classList.remove("at-story-terminal--intro");
  }

  // After discovery text, show choice
  setTimeout(() => {
    if (state.phase === "discovery") {
      state.phase = "choice";
      renderTerminal();
    }
  }, 800);
}

/**
 * Hide story mode terminal
 */
export function hideStoryMode(): void {
  if (!terminalElement) return;

  terminalElement.classList.remove("at-story-terminal--visible");
  terminalElement.classList.remove("at-story-terminal--intro");

  state = {
    isActive: false,
    currentArtifactId: null,
    selectedOptionIndex: 0,
    phase: "idle",
  };

  currentContent = null;

  // Resume movement
  resumeInput();
}

function createTerminalElement(): HTMLDivElement {
  const terminal = createElement(
    "div",
    { class: "at-story-terminal" },
    {}
  );

  return terminal;
}

function renderTerminal(): void {
  if (!terminalElement || !currentContent) return;

  const { artifactType, icon, typeName, content, isIntro, introText, isGhostMarker } = currentContent;
  const isDirection = artifactType === "direction";
  const isPortal = artifactType === "portal";
  const isSingleChoice = isIntro || isDirection;

  let html = "";

  // Discovery line
  if (isGhostMarker) {
    html += `<p class="at-story-line at-story-line--discovery">You found a <span class="at-story-icon">${icon}</span> ${typeName} here containing:</p>`;
  } else if (isIntro) {
    html += `<p class="at-story-line at-story-line--discovery">You have arrived at a <span class="at-story-icon">${icon}</span> welcome marker...</p>`;
  } else {
    html += `<p class="at-story-line at-story-line--discovery">You have found a <span class="at-story-icon">${icon}</span> ${typeName} containing:</p>`;
  }

  // Content line - check if content contains HTML elements that should be preserved (like images)
  const contentHtml = renderContentLine(content);
  if (isIntro && introText) {
    html += contentHtml;
    html += `<p class="at-story-line at-story-line--content">${escapeHtml(introText)}</p>`;
  } else {
    html += contentHtml;
  }

  // Choice phase - for single choice artifacts, just show a hint
  if (state.phase === "choice" || state.phase === "discovery") {
    if (isSingleChoice) {
      // Single choice: just show a hint to continue
      const hintText = isIntro ? "Press any key to begin..." : "Press any key to continue...";
      html += `<p class="at-story-line at-story-line--hint">${hintText}</p>`;
    } else if (isGhostMarker) {
      // Ghost marker: show return/leave options
      html += `<p class="at-story-line at-story-line--question">Would you like to...</p>`;
      html += `<div class="at-story-options">`;
      html += renderOption(0, `Return the ${typeName}`, state.selectedOptionIndex === 0);
      html += renderOption(1, "Leave this place", state.selectedOptionIndex === 1);
      html += `</div>`;
    } else {
      // Multiple choices: show the options
      html += `<p class="at-story-line at-story-line--question">Would you like to...</p>`;

      html += `<div class="at-story-options">`;

      if (isPortal) {
        // Portals have "Travel" option
        html += renderOption(0, "Step through the portal", state.selectedOptionIndex === 0);
        html += renderOption(1, "Leave it be", state.selectedOptionIndex === 1);
      } else {
        // Regular artifacts
        html += renderOption(0, `Take it with you`, state.selectedOptionIndex === 0);
        html += renderOption(1, "Leave it be", state.selectedOptionIndex === 1);
      }

      html += `</div>`;
    }
  }

  // Result phase
  if (state.phase === "result") {
    const tookIt = state.selectedOptionIndex === 0;
    let resultText: string;

    if (isIntro) {
      resultText = "Your adventure begins...";
    } else if (isDirection) {
      resultText = STORY_LEAVE_RESULTS[artifactType];
    } else if (isGhostMarker) {
      // Ghost marker results
      resultText = tookIt ? STORY_RETURN_RESULTS[artifactType] : STORY_GHOST_LEAVE_RESULTS[artifactType];
    } else if (tookIt) {
      resultText = STORY_TAKE_RESULTS[artifactType];
    } else {
      resultText = STORY_LEAVE_RESULTS[artifactType];
    }

    html += `<p class="at-story-line at-story-line--result">${resultText}</p>`;
  }

  terminalElement.innerHTML = html;

  // Add click handlers to options
  if (state.phase === "choice") {
    const options = terminalElement.querySelectorAll(".at-story-option");
    options.forEach((option, index) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent navigation click handler from interfering
        // Set selected index directly without re-rendering, then confirm
        state.selectedOptionIndex = index;
        confirmChoice();
      });
      option.addEventListener("mouseenter", () => {
        // Update visual selection without re-rendering (which would destroy click handlers)
        selectOptionVisual(index, options);
      });
    });
  }
}

/**
 * Updates the visual selection state without re-rendering the terminal.
 * This preserves click handlers on the options.
 */
function selectOptionVisual(index: number, options: NodeListOf<Element>): void {
  if (state.phase !== "choice") return;
  
  state.selectedOptionIndex = index;
  
  // Update visual state of all options
  options.forEach((option, i) => {
    const arrow = option.querySelector(".at-story-arrow");
    if (i === index) {
      option.classList.add("at-story-option--selected");
      if (arrow) arrow.textContent = "▶";
    } else {
      option.classList.remove("at-story-option--selected");
      if (arrow) arrow.textContent = "";
    }
  });
}

function renderOption(index: number, text: string, selected: boolean): string {
  const selectedClass = selected ? " at-story-option--selected" : "";
  const arrow = selected ? "▶" : "";
  return `<div class="at-story-option${selectedClass}" data-index="${index}">
    <span class="at-story-arrow">${arrow}</span>
    <span class="at-story-text">${text}</span>
  </div>`;
}

function selectOption(index: number): void {
  if (state.phase !== "choice") return;

  state.selectedOptionIndex = index;
  renderTerminal();
}

function confirmChoice(immediate: boolean = false): void {
  if (state.phase !== "choice" || !currentContent) return;

  const { artifactId, artifactType, isIntro, isGhostMarker } = currentContent;
  const tookIt = state.selectedOptionIndex === 0;
  const isDirection = artifactType === "direction";
  const isSingleChoice = isIntro || isDirection;

  // For single-choice with immediate flag, skip animations and close instantly
  if (isSingleChoice && immediate) {
    onLeaveCallback?.(artifactId);
    hideStoryMode();
    return;
  }

  // Show result
  state.phase = "result";
  renderTerminal();

  // Execute action after delay
  setTimeout(() => {
    if (isSingleChoice) {
      // Intro and direction just close
      onLeaveCallback?.(artifactId);
    } else if (isGhostMarker) {
      // Ghost marker: return item or leave the place
      if (tookIt) {
        onReturnCallback?.(artifactId);
      } else {
        onLeaveCallback?.(artifactId);
      }
    } else if (tookIt) {
      onTakeCallback?.(artifactId);
    } else {
      onLeaveCallback?.(artifactId);
    }

    // Hide terminal after result
    setTimeout(() => {
      hideStoryMode();
    }, 800);
  }, 600);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!state.isActive) return;
  if (!currentContent) return;

  // During result phase, block all keys to prevent input leaking to movement
  if (state.phase === "result") {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  const { artifactType, isIntro } = currentContent;
  const isDirection = artifactType === "direction";
  const isSingleChoice = isIntro || isDirection;

  // For single-choice artifacts, any key continues (even during discovery phase)
  if (isSingleChoice && (state.phase === "choice" || state.phase === "discovery")) {
    // Check if it's a movement key
    const isMovementKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D"].includes(e.key);
    
    // Force phase to choice so confirmChoice works
    state.phase = "choice";
    
    if (isMovementKey) {
      // Don't prevent default or stop propagation - let the key pass through to input system
      // Close immediately so movement starts right away
      confirmChoice(true);
    } else {
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop other handlers
      confirmChoice();
    }
    return;
  }

  // For multi-choice artifacts, handle in choice or discovery phase
  // (allow early interaction - force to choice phase if needed)
  if (state.phase !== "choice" && state.phase !== "discovery") return;

  // For multi-choice artifacts, handle navigation
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      e.preventDefault();
      e.stopImmediatePropagation();
      state.phase = "choice";
      navigateOptions(-1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      e.preventDefault();
      e.stopImmediatePropagation();
      state.phase = "choice";
      navigateOptions(1);
      break;
    case "Tab":
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop input system from receiving this
      state.phase = "choice"; // Force to choice phase
      // Tab navigates forward, Shift+Tab navigates backward
      navigateOptions(e.shiftKey ? -1 : 1);
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop input system from receiving this
      state.phase = "choice"; // Force to choice phase
      confirmChoice();
      break;
    case "Escape":
      e.preventDefault();
      e.stopImmediatePropagation(); // Stop input system from receiving this
      state.phase = "choice"; // Force to choice phase
      // Escape acts as "leave"
      state.selectedOptionIndex = 1;
      confirmChoice();
      break;
  }
}

function navigateOptions(direction: number): void {
  if (!currentContent) return;

  const { artifactType, isIntro } = currentContent;
  const isDirection = artifactType === "direction";

  // Determine max options
  let maxOptions = 2;
  if (isIntro || isDirection) {
    maxOptions = 1;
  }

  let newIndex = state.selectedOptionIndex + direction;
  if (newIndex < 0) newIndex = maxOptions - 1;
  if (newIndex >= maxOptions) newIndex = 0;

  selectOption(newIndex);
}

/**
 * Renders the content line, preserving HTML for images and other media
 */
function renderContentLine(content: string): string {
  // Check if content contains HTML elements that should be preserved
  const hasImage = /<img\s/i.test(content);
  const hasVideo = /<video\s/i.test(content);
  const hasIframe = /<iframe\s/i.test(content);
  const hasMedia = hasImage || hasVideo || hasIframe;

  if (hasMedia) {
    // Render HTML content directly in a container div (for images, videos, etc.)
    return `<div class="at-story-line at-story-line--content at-story-line--media">${content}</div>`;
  } else {
    // For text content, escape HTML and wrap in quotes
    return `<p class="at-story-line at-story-line--content">"${escapeHtml(stripHtml(content))}"</p>`;
  }
}

/**
 * Strip HTML tags from content for display
 */
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

