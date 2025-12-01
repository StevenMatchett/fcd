# fcd

Lightweight directory picker that fuzzy-matches folder names (no `fzf` needed).

## Install

### From npm (published package)
```
pnpm install -g @matchett/fcd
npm install -g @matchett/fcd
```

### From this repo
```
pnpm install -g .
npm install -g .
```

## Shell integration

Add one of these to your shell rc (zsh/bash):
```
# using npm
fcd() {
    dir="$(npm exec fcd "$@")"  || return
    [ -n "$dir" ] || {
            echo "No selection"
            return 1
    }
    cd "$dir"
}
# using pnpm
fcd() {
    dir="$(pnpm exec fcd "$@")"  || return
    [ -n "$dir" ] || {
            echo "No selection"
            return 1
    }
    cd "$dir"
}
```

## Usage

```
fcd <pattern> [searchRoot]
fcd api ..   # example: search for "api" under ../
```

If you don’t install globally, run via pnpm:
```
pnpm exec fcd <pattern> [searchRoot]
```

## Behavior

- Fuzzy-matches directory names only (case-insensitive, not full paths).
- Default search depth is 1 (only direct subdirectories); raise `FCD_MAX_DEPTH` to recurse.
- Interactive picker: arrow keys or j/k (g/G to jump), Enter to select, Esc/q to cancel.
- Prints the selected absolute path. Prompts go to stderr so wrappers like `dir="$(fcd foo)"` stay interactive.

## Options

- `FCD_MAX_DEPTH`: limit how deep `find` traverses (default: 1).
- `-h` / `--help`: show usage.

## Requirements

- Relies on the system `find` command.
