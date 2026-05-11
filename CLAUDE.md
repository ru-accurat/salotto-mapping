# Salotto Mapping

Working folder for the Salotto Mapping project — an interactive network visualization mapping the people behind Salotto Brooklyn's events as a constantly-evolving artwork.

## Current phase — build (Claude Code, from 2026-05-10)

Research phase complete. The data is in Google Drive (canonical) and mirrored locally in `salotto_mapping_v0.xlsx`. **The next task is implementing the visualization.**

**Read these in order on session start:**

1. `~/Desktop/Claude/Claude_Projects/Second Brain/01 - Projects/Salotto Mapping/README.md` — vault entry (project state, what's done, next actions).
2. `./Approach — Relationship Mapping.md` — full strategy + implementation memo. The end section **§Visualization implementation plan** is the build spec: reference-video visual analysis, palette + node/edge recipe, stack choice (Vite + React + TypeScript + Cosmograph + GSAP), schema, five-act animation script (~90s loop) with the three Act 4 cluster choreography beats (Vignelli legacy → Editorial constellation → Agency lineage), data flow, first prototype sequence. **Read this in full before writing code.**

**Build sequence (from the approach memo):**

1. `scripts/export_network.py` — read `salotto_mapping_v0.xlsx`, pre-compute force-directed layout (NetworkX), output `viz/public/network.json` with nodes + edges + BFS order from P004 Ponzi as seed.
2. Vite + React + TypeScript skeleton under `viz/`. Install `@cosmograph/cosmograph` and `gsap`.
3. Static render of the full network with the visual spec. **Screenshot review before any animation work.**
4. Iterate the still composition until it feels right (palette, node sizes, edge alphas, glow).
5. GSAP director — Acts 1, 2, 5 (reveal, propagation, pull-back) first.
6. Act 3 — cascading guest reveal.
7. Act 4 — three cluster focus beats.
8. Polish + loop.

**Stack reminder:**
- Vite + React + TypeScript scaffolding.
- `@cosmograph/cosmograph` (free for non-commercial; check licensing before public deployment).
- GSAP for animation choreography.
- Python (`openpyxl` + `networkx`) for the one-off xlsx → network.json export.

**Visual class hint:** organizations render as **hexagons**, people as **circles**. Cosmograph natively renders circles only — hexagons may need a custom node-renderer extension or a separate overlay layer. Decide early in the build.

## Second Brain

This project's living knowledge layer is maintained in Gabriele's Second Brain vault at
`~/Desktop/Claude/Claude_Projects/Second Brain/`. The canonical project entry is
`01 - Projects/Salotto Mapping/README.md`.

**Protocol:** read the vault entry at the start of substantive work. When material decisions,
conventions, or lessons emerge in a session, propose an update to the vault before the session ends.

Sibling project: [[Salotto]] — the Salotto Brooklyn pitch deck. This Mapping project is
distinct (events dataset / analysis) but shares the same cultural-space subject.

## Data sources

- **Canonical:** Google Sheet at <https://docs.google.com/spreadsheets/d/1DNx139ycl_xD3UXnIP_6-byhSySCgl-OVhFLGJ9I5G4/edit>. 11 sheets, stable IDs (P001–P139 for people, O01–O236 for orgs, E01–E50 for events, AF001–AF321 for affiliations, REL001–REL172 for relationships, S01–S09 for subjects).
- **Local mirror:** `salotto_mapping_v0.xlsx` in this folder. Same data. Use this for the build (no API calls needed).
- **Snapshots:** `snapshots/` directory has timestamped backups at significant milestones. Latest: `salotto_mapping_v0_2026-05-10_post-research-delta.xlsx`.

## Folder layout (post-reorganization 2026-05-10)

```
.
├── CLAUDE.md                              ← this file
├── Approach — Relationship Mapping.md     ← canonical strategy + build spec
├── salotto_mapping_v0.xlsx                ← data source for the build
│
├── archive/                               ← superseded inputs (do not consume)
├── pilot/                                 ← research-phase artifacts (audit trail)
│   ├── pilot_report.md, full_run_report.md, run_ledger.jsonl, pilot_results.xlsx
│   ├── raw/                  per-person full-pass research (55 files)
│   ├── raw_delta/            per-member delta-pass research (13 files)
│   ├── delta_csv/            paste-ready CSV deltas
│   └── intermediate/         agent scratch state (not consumed)
└── snapshots/                             ← timestamped xlsx backups
```

When Claude Code starts the build, it should expect to create:

- `scripts/` — for `export_network.py` (xlsx → network.json)
- `viz/` — Vite + React + TypeScript project (Cosmograph + GSAP)
- `.gitignore`, `README.md` — at Claude Code's discretion

The reorganization was 2026-05-10. If anything is missing from where this map says it should be, check `archive/` or `pilot/intermediate/` before re-deriving.

## Dataset summary (as of 2026-05-10)

- 50 events (E01–E50)
- 139 people: 14 members (P001–P014) + 86 event guests (P015–P100) + 39 ambient collaborators (P101–P139)
- 236 organizations (O01–O236)
- 94 attendances (person↔event)
- 321 affiliations (person↔org)
- 172 relationships (person↔person) — 91 programmatic member↔member co-membership + 81 researched edges
- 9 subjects (historical/biographical figures discussed at events but not present)
