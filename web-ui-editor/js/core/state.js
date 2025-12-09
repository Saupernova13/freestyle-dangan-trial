// Global state management for the application

// Cast and trial data
let cast = Array(BLOCK_COUNT).fill(null);
let trialName = "";
let dirHandle = null;

// View management
let activeView = "cast";  // "cast", "script", "truthBullets", or "minigames"
let scriptLines = [];     // Array of script line objects
let minigames = [];       // Array of minigame instance objects
let truthBullets = [];    // Array of truth bullet objects

// Drag-and-drop state
let draggedLineIds = [];       // IDs of lines being dragged (supports multi-select)
let selectedLineIds = new Set();  // Set of selected line IDs for multi-select
let dragGhostElement = null;   // Ghost element for drag preview
