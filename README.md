# fcd

Lightweight directory picker that matches folder names (no `fzf` needed), packaged with pnpm.

## Install

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
- When multiple results are found, shows the top matches and lets you pick with arrow keys or j/k (g/G to jump) + Enter (default is the top match).
- Prints the selected match as an absolute path.

To jump into the result, add a shell helper:

```
fcd() { cd "$(pnpm exec fcd "$@")" || return; }
# after global install, you can use the binary directly:
# fcd() { cd "$(command fcd "$@")" || return; }
```

### Options

- `FCD_MAX_DEPTH`: limit how deep `find` traverses (default: 1).
- `-h` / `--help`: show usage.

### Requirements

- Relies on the system `find` command.
