import * as vscode from "vscode";

const MAX_DIM = 8192;

const K_LAST_DIMS = "semanticPlaceholder.lastDims"; // e.g. "1200x600"
const K_LAST_RATIO = "semanticPlaceholder.lastRatio"; // "1:1" | "4:3" | ...
const K_LAST_ORIENT = "semanticPlaceholder.lastOrient"; // "Landscape" | "Portrait"
const K_LAST_MODE = "semanticPlaceholder.lastMode"; // "Width → Height" | "Height → Width"
const K_LAST_BASE = "semanticPlaceholder.lastBase"; // number as string, e.g. "1200"

function svgMarkup(width: number, height: number): string {
  const fontSize = Math.max(12, Math.min(width, height) / 10);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#6b7280" font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
        font-size="${fontSize}">
    ${width} × ${height}
  </text>
</svg>`.trim();
}

function svgDataUri(width: number, height: number): string {
  const svg = svgMarkup(width, height)
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/"/g, "%22")
    .replace(/\s+/g, " ");
  return `data:image/svg+xml;utf8,${svg}`;
}

function isValidDim(w: number, h: number): boolean {
  return (
    Number.isFinite(w) && Number.isFinite(h) &&
    Number.isInteger(w) && Number.isInteger(h) &&
    w > 0 && h > 0 &&
    w <= MAX_DIM && h <= MAX_DIM
  );
}

function parseDims(input: string): { w: number; h: number } | null {
  const cleaned = input.trim().toLowerCase().replace(/[×]/g, "x");
  // Accept: "1200x600" or "1200 600"
  // Limit to 4 digits since MAX_DIM is 8192
  const match = cleaned.match(/^(\d{1,4})\s*[x\s]\s*(\d{1,4})$/);
  if (!match) return null;

  const w = Number(match[1]);
  const h = Number(match[2]);

  return isValidDim(w, h) ? { w, h } : null;
}

function clampDims(w: number, h: number): { w: number; h: number } | null {
  return isValidDim(w, h) ? { w, h } : null;
}

async function insertAtSelections(text: string): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return false;
  }

  const success = await editor.edit((eb) => {
    for (const sel of editor.selections) {
      if (sel.isEmpty) eb.insert(sel.active, text);
      else eb.replace(sel, text);
    }
  });

  if (!success) {
    vscode.window.showErrorMessage("Failed to insert placeholder");
  }
  return success;
}

async function insertPlaceholder(width: number, height: number): Promise<boolean> {
  const success = await insertAtSelections(svgDataUri(width, height));
  if (success) {
    vscode.window.showInformationMessage(`Placeholder inserted: ${width}×${height}`);
  }
  return success;
}

function validateDimensionInput(input: string): string | null {
  const num = Number(input.trim());
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return `Enter an integer (e.g. 1200)`;
  }
  if (num <= 0) return "Must be > 0";
  if (num > MAX_DIM) return `Max is ${MAX_DIM}`;
  return null;
}

// ---- Commands ----

async function promptAndInsertPlaceholder(context: vscode.ExtensionContext) {
  const lastDims = context.globalState.get<string>(K_LAST_DIMS) ?? "1200x600";

  const input = await vscode.window.showInputBox({
    prompt: "Placeholder dimensions",
    placeHolder: "1200x600",
    value: lastDims,
    validateInput: (v) => {
      const dims = parseDims(v);
      if (!dims) return `Expected format: 1200x600 (max ${MAX_DIM}×${MAX_DIM})`;
      return null;
    }
  });

  if (!input) return;
  
  const dims = parseDims(input);
  if (!dims) {
    vscode.window.showErrorMessage("Invalid dimensions. Expected format: 1200x600");
    return;
  }

  const success = await insertPlaceholder(dims.w, dims.h);
  if (success) {
    await context.globalState.update(K_LAST_DIMS, `${dims.w}x${dims.h}`);
  }
}

type RatioKey = "1:1" | "4:3" | "4:5" | "16:9";
const RATIOS: Record<RatioKey, { a: number; b: number }> = {
  "1:1": { a: 1, b: 1 },
  "4:3": { a: 4, b: 3 },
  "4:5": { a: 4, b: 5 },
  "16:9": { a: 16, b: 9 }
};

type Orientation = "Landscape" | "Portrait";
type Mode = "Width → Height" | "Height → Width";

const ORIENT_ITEMS: Orientation[] = ["Landscape", "Portrait"];
const MODE_ITEMS: Mode[] = ["Width → Height", "Height → Width"];

async function promptAndInsertWithRatio(context: vscode.ExtensionContext) {
  const lastBase = context.globalState.get<string>(K_LAST_BASE) ?? "1200";

  const ratioItems = Object.keys(RATIOS).map((k) => ({ label: k }));
  const ratioPick = await vscode.window.showQuickPick(ratioItems, {
    placeHolder: "Choose a ratio"
  });
  if (!ratioPick) return;

  // ✅ Special case: 1:1 (square) -> no orientation, no mode, single value
  if (ratioPick.label === "1:1") {
    const input = await vscode.window.showInputBox({
      prompt: "Enter size (px) for 1:1",
      placeHolder: "400",
      value: lastBase,
      validateInput: validateDimensionInput
    });
    if (!input) return;

    const size = Number(input.trim());
    const dims = clampDims(size, size);
    if (!dims) {
      vscode.window.showErrorMessage(
        `Invalid dimensions (${size}×${size}). Max is ${MAX_DIM}×${MAX_DIM}.`
      );
      return;
    }

    const success = await insertPlaceholder(dims.w, dims.h);
    if (success) {
      // Batch update to globalState
      await Promise.all([
        context.globalState.update(K_LAST_RATIO, "1:1"),
        context.globalState.update(K_LAST_BASE, String(size)),
        context.globalState.update(K_LAST_DIMS, `${dims.w}x${dims.h}`)
      ]);
    }
    return;
  }

  // Ratios != 1:1 -> keep full flow
  const orientPick = await vscode.window.showQuickPick(ORIENT_ITEMS, {
    placeHolder: "Orientation"
  });
  if (!orientPick) return;

  const modePick = await vscode.window.showQuickPick(MODE_ITEMS, {
    placeHolder: "Compute using…"
  });
  if (!modePick) return;

  const base = RATIOS[ratioPick.label as RatioKey];
  const a = orientPick === "Landscape" ? base.a : base.b;
  const b = orientPick === "Landscape" ? base.b : base.a;

  const askFor = modePick.startsWith("Width") ? "width" : "height";
  const input = await vscode.window.showInputBox({
    prompt: `Enter ${askFor} (px) for ${a}:${b}`,
    placeHolder: askFor === "width" ? "1200" : "600",
    value: lastBase,
    validateInput: validateDimensionInput
  });
  if (!input) return;

  const baseValue = Number(input.trim());
  let width, height;

  // Safety check: prevent division by zero
  if (a === 0 || b === 0) {
    vscode.window.showErrorMessage("Invalid ratio configuration");
    return;
  }

  if (askFor === "width") {
    width = baseValue;
    height = Math.round(width * b / a);
  } else {
    height = baseValue;
    width = Math.round(height * a / b);
  }

  const dims = clampDims(width, height);
  if (!dims) {
    vscode.window.showErrorMessage(
      `Invalid dimensions (${width}×${height}). Max is ${MAX_DIM}×${MAX_DIM}.`
    );
    return;
  }

  const success = await insertPlaceholder(dims.w, dims.h);
  if (success) {
    // Batch update to globalState
    await Promise.all([
      context.globalState.update(K_LAST_RATIO, ratioPick.label),
      context.globalState.update(K_LAST_ORIENT, orientPick),
      context.globalState.update(K_LAST_MODE, modePick),
      context.globalState.update(K_LAST_BASE, String(baseValue)),
      context.globalState.update(K_LAST_DIMS, `${dims.w}x${dims.h}`)
    ]);
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Cache SVG data URIs for presets (max 10 to prevent unbounded memory growth)
  const svgCache = new Map<string, string>();
  const MAX_CACHE_SIZE = 10;

  /** Helper to insert preset and remember dimensions */
  const insertPreset = (width: number, height: number) => async () => {
    const key = `${width}x${height}`;
    if (!svgCache.has(key)) {
      if (svgCache.size >= MAX_CACHE_SIZE) {
        const firstKey = svgCache.keys().next().value;
        if (firstKey) {
          svgCache.delete(firstKey);
        }
      }
      svgCache.set(key, svgDataUri(width, height));
    }
    const success = await insertAtSelections(svgCache.get(key)!);
    if (success) {
      await context.globalState.update(K_LAST_DIMS, key);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("semanticPlaceholder.insert", () =>
      promptAndInsertPlaceholder(context)
    ),
    vscode.commands.registerCommand("semanticPlaceholder.insertRatio", () =>
      promptAndInsertWithRatio(context)
    ),
    vscode.commands.registerCommand("semanticPlaceholder.hero", insertPreset(1440, 720)),
    vscode.commands.registerCommand("semanticPlaceholder.card", insertPreset(400, 300)),
    vscode.commands.registerCommand("semanticPlaceholder.avatar", insertPreset(128, 128))
  );
}

export function deactivate() {}
