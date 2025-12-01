# fcd

Lightweight directory picker that matches folder names (no `fzf` needed).

## Install

Install directly from npm (public package):

```
pnpm install -g @matchett/fcd
# or
npm install -g @matchett/fcd
```

From the repo root, install the binary onto your `PATH`:

```
pnpm install -g .
# or
npm install -g .
```


If you prefer not to install globally, you can run it via pnpm without installing:

```
pnpm exec fcd <pattern> [searchRoot]
```

## Usage

```
pnpm exec fcd <pattern> [searchRoot]
pnpm exec fcd api ..   # example: search for "api" under ../
```

Behavior:
- Fuzzy-matches against directory names only (not the full path), case-insensitive.
- Default search depth is 1 (only direct subdirectories); raise `FCD_MAX_DEPTH` to recurse.
- When multiple results are found, shows the top matches and lets you pick with arrow keys or j/k (g/G to jump) + Enter (default is the top match). Esc/q cancels.
- Prints the selected match as an absolute path.
- Prompts are written to stderr so command substitution like `dir="$(fcd foo)"` stays interactive.

To jump into the result, add a shell helper:

Add to your .zshrc or equivalent:

### If you use pnpm
```
fcd() { cd "$(pnpm exec fcd "$@")" || return; }
```

### If you use npm
```
# after global install, you can use the binary directly:
# fcd() { cd "$(npm exec fcd "$@")" || return; }
```

### Options

- `FCD_MAX_DEPTH`: limit how deep `find` traverses (default: 1).
- `-h` / `--help`: show usage.

### Requirements

- Relies on the system `find` command.
