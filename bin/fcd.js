#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

function fuzzyScore(pattern, text) {
  // Simple subsequence-based scorer inspired by fuzzy finders.
  let score = 0;
  let ti = 0;
  let lastMatch = -1;
  const positions = [];

  for (const pc of pattern) {
    const idx = text.indexOf(pc, ti);
    if (idx === -1) return null;

    positions.push(idx);
    score += 5; // base match
    if (idx === lastMatch + 1) score += 10; // contiguous bonus
    if (idx === 0) score += 3; // prefix bonus
    score += Math.max(0, 2 - idx); // earlier positions favored

    ti = idx + 1;
    lastMatch = idx;
  }

  score -= text.length - pattern.length; // shorter names favored
  return { score, positions };
}

function interactiveSelect(candidates) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
      resolve(candidates[0].dir);
      return;
    }

    const maxDisplay = 20;
    const shown = candidates.slice(0, maxDisplay);
    const cwd = process.cwd();
    let index = 0;
    let hiddenCursor = false;
    const linesCount = shown.length + 1; // hint + items

    function colorizeMatch(text, positions) {
      if (!positions || positions.length === 0) return text;
      const set = new Set(positions);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (set.has(i)) out += "\u001b[31m" + ch + "\u001b[39m";
        else out += ch;
      }
      return out;
    }

    function cleanup() {
      if (hiddenCursor) process.stderr.write("\u001b[?25h");
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    }

    function render(initial = false) {
      const lines = [];
      lines.push("Use \u2191/\u2193 or j/k (g/G to jump), Enter to select, q to cancel.");
      shown.forEach((c, i) => {
        const prefix = i === index ? ">" : " ";
        const rel = path.relative(cwd, c.dir) || ".";
        const name = colorizeMatch(c.base, c.matchPositions);
        const line = `${prefix} ${name}   ${rel}`;
        lines.push(i === index ? `\u001b[7m${line}\u001b[0m` : line);
      });

      if (!initial) {
        process.stderr.write(`\u001b[${linesCount}F`);
      }
      process.stderr.write(lines.join("\n") + "\n");
    }

    function onData(chunk) {
      const str = chunk.toString();
      if (str === "\u0003" || str === "\u001b" || str === "q") {
        cleanup();
        resolve(null);
        return;
      }

      if (str === "\r" || str === "\n") {
        const selection = shown[index];
        cleanup();
        resolve(selection.dir);
        return;
      }

      if (str === "\u001b[A") {
        // up
        index = (index - 1 + shown.length) % shown.length;
        render();
        return;
      }

      if (str === "\u001b[B") {
        // down
        index = (index + 1) % shown.length;
        render();
        return;
      }

      if (str === "k" || str === "K") {
        index = (index - 1 + shown.length) % shown.length;
        render();
        return;
      }

      if (str === "j" || str === "J") {
        index = (index + 1) % shown.length;
        render();
        return;
      }

      if (str === "g") {
        index = 0;
        render();
        return;
      }

      if (str === "G") {
        index = shown.length - 1;
        render();
        return;
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.on("data", onData);
    process.stderr.write("\u001b[?25l");
    hiddenCursor = true;
    render(true);
  });
}

const args = process.argv.slice(2);

function printUsage() {
  console.log(`fcd <pattern> [searchRoot]

Find a directory by name (no fzf required) and print the best match as an absolute path.
Examples:
  fcd api             # search from the current directory
  fcd api ..          # search from ../

Environment:
  FCD_MAX_DEPTH   Limit how deep find will traverse (default: 1; set 1 to avoid recursion)`);
}

if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const [queryRaw = "", searchRootArg = "."] = args;
const query = queryRaw.trim();

const searchRoot = path.resolve(searchRootArg);

const maxDepth = (() => {
  const parsed = Number.parseInt(process.env.FCD_MAX_DEPTH || "1", 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
})();

if (!fs.existsSync(searchRoot) || !fs.statSync(searchRoot).isDirectory()) {
  console.error(`Search root is not a directory: ${searchRoot}`);
  process.exit(1);
}

if (!query) {
  console.error("A search pattern is required.");
  printUsage();
  process.exit(1);
}

// Build the find command to stream directories. We prune common heavy folders
// to keep results focused and faster.
const findArgs = [
  searchRoot,
  "-maxdepth",
  String(maxDepth),
  "-mindepth",
  "1",
  "(",
  "-name",
  ".git",
  "-o",
  "-name",
  "node_modules",
  "-o",
  "-name",
  ".pnpm-store",
  ")",
  "-prune",
  "-o",
  "-type",
  "d",
  "-print",
];

const queryLower = query.toLowerCase();

const candidates = [];

const findProc = spawn("find", findArgs, {
  stdio: ["ignore", "pipe", "inherit"],
});
findProc.on("error", (err) => {
  console.error(`Failed to run find: ${err.message}`);
  process.exit(1);
});

const rl = readline.createInterface({ input: findProc.stdout });
rl.on("line", (dir) => {
  if (!dir) return;
  const resolved = path.resolve(dir);
  const base = path.basename(resolved);
  const baseLower = base.toLowerCase();

  const match = fuzzyScore(queryLower, baseLower);
  if (match === null) return;

  candidates.push({
    dir: resolved,
    base,
    matchPositions: match.positions,
    score: match.score,
    depth: resolved.split(path.sep).length,
    nameLength: base.length,
    fullLength: resolved.length,
  });
});

findProc.on("close", (code) => {
  rl.close();

  if (code !== 0) {
    process.exit(code || 1);
  }

  candidates.sort((a, b) => {
    return (
      b.score - a.score ||
      a.depth - b.depth ||
      a.nameLength - b.nameLength ||
      a.fullLength - b.fullLength ||
      a.dir.localeCompare(b.dir)
    );
  });

  if (candidates.length === 0) {
    console.error(`No directories matched "${query}".`);
    process.exit(1);
  }

  interactiveSelect(candidates)
    .then((dir) => {
      if (!dir) {
        process.exit(130);
        return;
      }
      console.log(dir);
    })
    .catch((err) => {
      console.error(err.message || String(err));
      process.exit(1);
    });
});
