# Kanban Archiver

An [Obsidian](https://obsidian.md) plugin by **Starsha** that automatically archives completed Kanban cards older than a configurable number of days to a separate archive file — keeping your boards clean without losing history.

## Features

- Archive completed cards older than N days (default: 30) to `Archive_[boardname].md`
- Treats all cards in your **Done column** as completed, whether ticked `[x]` or not
- Auto-stamps today's date on any card you tick `[x]` that has no existing date — so every card is always archivable
- First-run migration prompt: detects undated completed cards and offers to stamp them in bulk
- Undated cards are archived to a separate `### Undated (review)` section so nothing is silently lost
- Configurable Done column names — works with any naming convention
- Archive file path shown in plugin settings — no mystery about where your history goes
- Works on the current file or vault-wide across all Kanban boards

## Recommended Board Structure

For best results, use the standard Kanban list naming convention:

| List | Purpose |
|---|---|
| **To do** | Cards not yet started |
| **Doing** | Cards actively in progress |
| **Done** | Completed cards — archived automatically by this plugin |

This plugin is configured by default for a `Done` column. If your board uses a different name (e.g. `Completed`, `Closed`), update the **Done column names** setting accordingly — comma-separated for multiple columns.

> **Note for beginners:** Unlike some tools (e.g. Salesforce which uses "In Progress" instead of "Doing"), the To do / Doing / Done convention is the most widely recognised Kanban standard and works out of the box with this plugin.

## Installation

### From Obsidian Community Plugins (recommended)
1. Open Obsidian Settings → Community plugins
2. Turn off Restricted mode
3. Browse → search "Kanban Archiver"
4. Install and enable

### Manual install
1. Download `kanban-archiver-[version].zip` from [Releases](../../releases)
2. Extract into your vault's plugin folder:
   ```
   <vault>/.obsidian/plugins/kanban-archiver/
   ```
3. Enable in Settings → Community plugins

## Usage

### Archive current board
`Ctrl+P` → `Archive completed items older than threshold`

### Archive all boards
`Ctrl+P` → `Archive completed items in all Kanban boards`

### Auto-stamp
Tick any card — if it has no date, today's date is automatically appended. No manual work needed.

## Settings

| Setting | Default | Description |
|---|---|---|
| Days threshold | 30 | Archive completed items older than this many days |
| Archive file prefix | `Archive_` | Prefix for generated archive files |
| Auto-stamp on completion | On | Append today's date when ticking a card with no existing date |
| Done column names | `Done` | Comma-separated list of column names treated as completed |
| Archive locations | — | Read-only display of resolved archive paths for each board |
| Re-run migration | — | Trigger the first-run undated card migration prompt again |

## Archive file format

Archive files are created in the same directory as the board:

```
Board Kanban/
├── Board daily stuff.md
├── Board projects.md
├── Archive_Board daily stuff.md   ← auto-created
└── Archive_Board projects.md      ← auto-created
```

Each archive run appends a dated section:

```markdown
## Archived 2026-05-26
- [x] Completed task (@2026-04-10)
- [x] Another task 2026-03-15

### Undated (review)
- [x] Old task with no date
```

## License

MIT — free to use, modify, and distribute.

## Author

**Starsha** — [kworld.space](https://kworld.space)
