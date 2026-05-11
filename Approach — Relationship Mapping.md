# Approach — Relationship Mapping

Working reference for how to map the network of people behind Salotto Brooklyn's events.

**Status (2026-05-10):** Research phase complete. Workbook populated. Build phase next — implementation moves to Claude Code.

**Dataset:** **139 people** (14 members + 86 event guests + 39 ambient collaborators) · **236 organizations** · 50 events · 94 attendances · **321 affiliations** · 172 relationships · 9 subjects. Canonical store is the Google Sheet at <https://docs.google.com/spreadsheets/d/1DNx139ycl_xD3UXnIP_6-byhSySCgl-OVhFLGJ9I5G4/edit>. Local mirror at `salotto_mapping_v0.xlsx`.

**Tavily credits spent to date:** ~1,222 of 4,000 (research delta + pilot + full pass).

**Update history:**
- 2026-05-08: drafted, member node-class added, Wikidata+Tavily formalized as research stack.
- 2026-05-10: 9 historical/biographical subjects removed; ambient node-class added (Q2); revised confidence scale adopted (Q1: 1.0 = verifiable public record, not Wikidata-canonical).
- 2026-05-10: Google Sheet conversion. Workbook is now native in Drive; local xlsx is backup mirror.
- 2026-05-10: research delta — targeted Tavily pass on 14 members for prestigious publications + institutions + advertising agencies. +135 affiliations, +115 organizations. Editorial spine (NYT/NewYorker/Italian press) and agency lineage (Pentagram-hub + members' agency portfolios) now data-backed.
- 2026-05-10: visualization implementation plan added (§Visualization implementation plan). Build moves to Claude Code.

The vault entry for this project is `~/Desktop/Claude/Claude_Projects/Second Brain/01 - Projects/Salotto Mapping/README.md`.

## Node classes

Two distinct populations feed the network, stored in separate files but unified at the visualization layer:

- **Salotto members** — 14 people total: 6 co-founders, 8 members. Source of truth: `salotto_members.xlsx` / `.json`. Anchored by LinkedIn URL.
- **Event participants** — guests, hosts, speakers, moderators, performers across the 50 events. Source of truth: `people_by_event.xlsx` / `.json`. **90 unique people** after the 2026-05-08 curatorial pass that removed 9 historical/biographical subjects (people discussed at events but not present). Excluded names preserved in the JSON `metadata.exclusions[]` for possible later use as a separate "subjects of conversation" node-class.

Some people belong to both (Emiliano Ponzi, Lorenzo Fanton, Gabriele Rossi, Gabriel Zangari are members and have appeared on stage as guests/hosts). The deduplication rule: **member status takes precedence in the visualization** — these people render as members, with their event participation captured as edges to the events rather than as a separate role-class.

In the unified people-master used by the visualization, each node carries a `member_status` field (`co_founder` / `member` / `none`). Visual treatment differentiates: members are larger, in Salotto's brand color or with a halo; co-founders carry a subtle additional mark (a ring, a thicker stroke). Guests/participants render in neutral. The viewer reads the diagram as "the community grew from this small group outward."

**The highest-value edges are member↔guest edges.** They are what makes Salotto a connector. When members invite a guest, that connection becomes Salotto's gift to the broader community — it didn't exist before, or existed only weakly, and now it's anchored. Surface those edges with the most visual weight.

---

## Population, and why standard playbooks miss

Salotto's people are mostly **designers, artists, writers, journalists, curators, filmmakers, and Italian cultural figures**, with a B2B/exec layer (founders, executives) only at the edges.

This matters because the standard "scrape LinkedIn + enrich with Apollo" playbook is built for the opposite population — B2B sales prospects. For Salotto, that pipeline gets ~30% coverage. The other ~70% lives in places those tools don't reach: Wikidata, personal websites, gallery/agent rosters, press archives, Instagram.

Plan around that asymmetry, not against it.

---

## Three layers, in order

### Layer 1 — Canonical identity disambiguation

Before any relationship mining, every one of the 90 people needs a stable identifier. Otherwise deduplication eats the project.

- Best free anchor: **Wikidata** (each entity has a QID). Many of the 90 likely have entries: Jhumpa Lahiri, Paola Antonelli, Cecilia Alemani, Mauro Porcini, Federico Marchetti, Ghemon, Lorenzo Mattotti, Anthony Dunne, etc.
- Fallback in order of preference: personal website URL → LinkedIn URL → Instagram handle.
- Output: `person_id ↔ {wikidata_qid, linkedin_url, instagram, website, agent/gallery}`.

Wikidata is also a **relationship goldmine** — it natively encodes `educated at`, `employed by`, `member of`, `spouse of`, `represented by gallery`, `student of`, `notable work`. Layer 1 produces real Layer 2 edges as a side effect.

### Layer 2 — Hard connections

Formal, documentable links: same employer, same school, same board, co-author, same gallery, same agent, same publisher, formal collaboration on a documented project.

| Source | Best for |
|---|---|
| Wikidata + Wikipedia (SPARQL) | Cultural figures — artists, writers, curators, filmmakers. |
| LinkedIn (via Apollo / PDL — see ethics note) | Tech/exec/journalist subset. |
| Crunchbase | Founders, board memberships. |
| Google Scholar / OpenAlex / ORCID | Academic edges, co-authorship. |
| IMDb + Wikidata | Film/TV credits. |
| Press archives (NYT, Vogue, Domus, Hyperallergic, Apartamento, Wallpaper, Frieze, Artforum, Il Post, Wired Italia) | `"Person A" "Person B"` co-mentions. |

### Members — same pipeline, different defaults

The 14-person member list runs through Layers 1–3 the same way, with two adjustments:

- **LinkedIn is genuinely useful for this population.** Members are professionals on the platform, the URL is the canonical anchor (already provided). Apollo and PDL coverage will be high. Use them.
- **Past + current employers matter more than for the guest population.** A member's pre-Salotto network is what they bring to Salotto — surface their employment history aggressively, because every former employer becomes an organizational node, and former colleagues are candidate latent edges to surface in future Salotto events.

Run the member enrichment pass first if budget is tight: 14 people gives a high-precision skeleton of the network, and member↔guest edges drop out of the existing event-attendance data without any further enrichment.

### Layer 3 — Soft connections (the artwork's actual soul)

This is where most relationship-mapping projects fail because they only do Layer 2. The signals worth chasing:

- **Mutual social follows**, especially Instagram. Salotto's population lives there more than on LinkedIn. "A follows B and B follows A" = lightweight mutual recognition.
- **Co-tagged photos** on Instagram (`@A` and `@B` in the same post). High-signal — physical co-presence.
- **Co-attendance at non-Salotto events** — Triennale openings, NYC Design Week, Frieze, Festivaletteratura, Casa IED. Public attendee lists where they exist.
- **Same gallery / publisher / agent / editor.** Strong soft tie even when the people themselves don't know each other — the gatekeeper does.
- **Co-mention in third-party press** without being subjects of it. Implies "part of the same conversation."
- **Same school / cohort / city / scene.** Italian designers from Politecnico, Italian-NY diaspora, Williamsburg creatives. Weak but real.
- **Recurring co-presence at Salotto itself.** Already in the dataset. Two people at three+ shared Salotto events is not a coincidence.

**The artwork move:** type the edges, weight them differently in the visualization. Hard edges short, dark, opaque. Soft edges longer, fainter, dashed. Salotto-internal co-presence its own color. The viewer feels the topology — formal vs implicit, public vs Salotto-induced.

---

## Research stack — canonical pipeline

Two tools, in this order, do most of the work:

### Wikidata (free, structured, deterministic)

The skeleton of the network. Queried via the public SPARQL endpoint at `https://query.wikidata.org/sparql`. For each name in `people_by_event.xlsx` and `salotto_members.xlsx`:

1. Resolve the name to a QID (use the `wbsearchentities` API, then disambiguate by `instance of: human` + occupation/nationality).
2. Pull structured edges: `educated at` (P69), `employer` (P108), `member of` (P463), `notable work` (P800), `award received` (P166), `student of` / `student` (P1066/P802), `represented by` (P1875, for galleries), `spouse` (P26), `country of citizenship` (P27), `occupation` (P106).
3. Pull org metadata for any organization that turns up so the org-node table populates from the same query.

Wikidata is the source of all *high-confidence* hard edges. Every edge from Wikidata gets `confidence: 1.0` and `evidence_url` pointing at the QID page.

Likely coverage: ~70% of the 90 guests, near-100% of the headline names (Lahiri, Antonelli, Alemani, Porcini, Marchetti, Mattotti). Most members will have thin or no entries.

### Tavily (paid per query, fills the long tail)

The connective tissue. Tavily MCP is now connected; the relevant tools:

| Tool | When to use it |
|---|---|
| `tavily_research` | Per-person research mode. One call per name returns a synthesized profile with citations. Best for "who is X, what are they known for, what institutions are they tied to, who do they collaborate with." Use for the ~30% of guests Wikidata can't resolve, and for the 14 members. |
| `tavily_search` | Targeted edge hypotheses: `"Person A" "Person B"` co-mention queries, `"Person A" "institution"` affiliation checks. Cheaper per call than `research`, used in volume during edge-mining. |
| `tavily_extract` | Pull and clean a specific URL when the search snippet isn't enough — useful for personal sites, gallery rosters, press pieces. |
| `tavily_crawl` | Pull a whole domain when you want comprehensive context — e.g., everything Pentagram says about Giorgia Lupi, everything on a member's personal portfolio site. Use sparingly, expensive. |
| `tavily_map` | Less critical for this project — useful for sitemap exploration. |

Tavily output is unstructured prose. The pipeline step after each Tavily call is **edge typing**: I read the synthesis, extract candidate edges into the `relationships` table with their evidence URLs, and flag confidence (`0.6–0.9` for Tavily-synthesized edges, lower if the citation is a single source, higher if multiple independent citations agree).

### How they compose

For any given person, the full Layer-1+2 pass is:

1. Wikidata QID resolution → if found, pull all structured edges, mark covered.
2. If not found OR Wikidata entry is thin: `tavily_research` for synthesized profile.
3. For every Salotto event the person was at: `tavily_search` queries pairing them with each *other* attendee at the same event (since they were physically co-present, hard edges may already exist that aren't on Wikidata).
4. For members specifically: an extra `tavily_research` query focused on employment history and past collaborators (their pre-Salotto network is what matters).

Estimated cost for the full first pass (90 guests + 14 members): ~140 `tavily_research` calls + ~450 `tavily_search` calls. Tavily pricing as of writing is ~$0.008 per search credit; `research` mode runs more credits per call. Budget realistically $80–150 for the first complete pass.

---

## Tools, ranked for *this* project

The canonical pipeline above covers Layers 1–2. The tools below are everything else, ordered by how I'd reach for them.

### Extraction / enrichment

1. **Wikidata SPARQL** — primary. Already covered in the canonical pipeline.
2. **Tavily MCP** — primary. Already covered in the canonical pipeline.
3. **Clay (clay.com)** — research/enrichment workspace built for chaining sources (Apollo + LinkedIn + AI prompts + web search) per row. Useful if Tavily + Wikidata leave too much manual cleanup; Clay automates the row-by-row enrichment loop. Pricier ($200–500/month). Most useful once we know which fields are the bottleneck.
4. **Apollo.io** — B2B contact DB with API. Strong for the founder/exec layer (~20 of 90 guests, all 14 members). The cleanest LinkedIn-shaped data without ToS risk.
5. **PeopleDataLabs (PDL)** — bulk person-enrichment API. Alternative to Apollo. Pay per resolved match.
6. **Apify** — marketplace of pre-built scrapers. The Layer-3 tool. Useful actors: *Instagram Profile Scraper*, *Twitter/X Profile Scraper*, *Eventbrite Scraper*. Best for the soft-edge layer where Tavily can't reach (mutual social follows, photo co-tags).
7. **PhantomBuster** — Apify's older sibling. Pick one.
8. **Crunchbase API** — founder/board edges. Limited free tier.
9. **OpenAlex API / Google Scholar via SerpAPI** — academic subset. OpenAlex is free and has co-authorship graph data baked in.
10. **Exa MCP** — semantic search. Worth installing as a Tavily backup; cheap to have.
11. **Claude / Gemini with web access** — long tail of cases where Tavily's synthesis isn't enough.

### LinkedIn — the ethics / legality note

LinkedIn ToS prohibits scraping, and they prosecute (*hiQ v. LinkedIn* — hiQ initially won but the underlying scraping was eventually limited). Three options:

1. Use a marketplace tool (Apify, PhantomBuster) — accept the ToS risk.
2. Use the official LinkedIn API — too limited to be useful for this work.
3. Use **Apollo.io** or **PeopleDataLabs**, which have already-resolved person datasets you can query — the cleaner path.

For artists/writers/curators (most of the 90), LinkedIn is weak anyway. So this is mostly a non-issue.

---

## Database — the most important architectural call

A relational DB is fine for `people` and `organizations`. But **the relationships are the product** — for that, prefer a graph store.

| Option | When it's right |
|---|---|
| **Neo4j (or Memgraph)** | Research/staging layer. Cypher queries express "who connects A and B," centrality, "all paths length ≤ 3 between Italian designers and American journalists" trivially. |
| **Kumu.io** | If the deliverable is "an evolving artwork on the wall and a webpage," Kumu can be the entire stack. Fast (1-day prototype). Customization ceiling will hit once Accurat-quality polish is required. |
| **Postgres + `pgvector` + edge table** | Full custom freedom. Render with d3-force, Cosmograph, or a custom WebGL piece. The likely *artwork-runtime* given Accurat's aesthetic standards. |
| **Google Sheets** ★ | The chosen v0. Free, already in Google Workspace, ideal for multi-person curation of the soft-edge layer. No native foreign keys — relational integrity is manual via `_id` columns and validation rules — but at this scale that's a non-issue. CSV / API export when promoting to Neo4j is trivial. |
| ~~Airtable~~ | Considered for v0 but Sheets won — already in Workspace, easier collaborative curation, no per-seat cost. |

**Recommended path:** Google Sheets → Neo4j (research/staging) → Postgres + custom WebGL viz (production artwork). Two transitions, but each step de-risks the next.

---

## Schema sketch

```
people
  id, canonical_name, wikidata_qid, linkedin_url, instagram, website,
  primary_role (artist/writer/etc.), nationality, city, gender,
  member_status (co_founder | member | none | ambient),  -- ambient added 2026-05-10
  notes
  -- viz hint: rendered as CIRCLES. Size by member_status.

organizations
  id, name, type (gallery/magazine/agency/school/etc.), city, wikidata_qid
  -- viz hint: rendered as HEXAGONS to distinguish from person-nodes.

affiliations (person ↔ org)
  person_id, org_id, role, start_year, end_year, source, confidence, evidence_url
  -- 321 rows as of 2026-05-10

relationships (person ↔ person)
  person_a, person_b,
  type — FREE-TEXT (strict-enum dropped 2026-05-10),
  _status (candidate | verified | rejected),
  source, confidence, evidence_url, salotto_event_indices
  -- 172 rows as of 2026-05-10 (91 programmatic member↔member + 81 researched)

events  (already extracted)
  id, date, title, summary, url, capacity, is_free

attendances (person ↔ event)
  attendance_id, person_id, event_id, role_at_event, affiliation_at_event, source_excerpt

subjects (people discussed at events but not present — toggleable layer)
  id, canonical_name, event_id, relevance (deceased_subject | historical_figure | discussed_only)
  -- 9 rows. viz hint: rendered as DASHED-OUTLINE shapes if shown.
```

**The `evidence_url` + `confidence` columns are the artistic move** — they let the visualization render *certainty* alongside connection. A faint dashed line = "Apify scraped a mutual Instagram follow." A solid dark line = "Wikidata says they co-founded a company together." Same network, different visual languages of trust.

---

## Sequence — what's done, what's next

**Done (Cowork sessions, 2026-05-08 → 2026-05-10):**
1. ✅ Resolved the four `needs_check` member names. All 14 members `name_confidence: confirmed`.
2. ✅ Pilot pipeline on 5 members. Methodology calibrated: mini mode default, Wikipedia-of-others is gold, confidence scale revised, ambient node-class added.
3. ✅ Full member enrichment pass (9 remaining + pilot 5 merged).
4. ✅ Guest pass on all 86 event-only people via Tavily search + research.
5. ✅ Ambient node discovery (39 added: Simone Quadri, Eric Zimmerman, Fabio Tridenti, Federico Pepe, Steven Heller, Louise Fili, Eric Zimmerman, etc.).
6. ✅ Member↔member co-membership edges generated programmatically (91 edges).
7. ✅ Google Sheets v0 built and converted to native Sheet in Drive. Local xlsx is backup mirror.
8. ✅ Visualization stack chosen: **Cosmograph (React + WebGL) + GSAP for animation choreography**. Schema confirmed.
9. ✅ Targeted research delta on all 14 members for publications + institutions + agencies. +135 affiliations, +115 organizations. Editorial spine and agency lineage now data-backed.

**Next (Claude Code, build phase):**
10. **Export script.** Python (or Node) reads the local `salotto_mapping_v0.xlsx`, produces `viz/network.json` with: nodes (incl. pre-computed force-directed `x,y` via NetworkX or d3-force), edges, BFS order from seed (P004 Ponzi), org-vs-person class flag.
11. **Cosmograph React skeleton (Vite project).** Static render of the full network with the visual spec applied. Screenshot review before any animation. **Don't move to animation until the still feels right.**
12. **GSAP director.** Implement the five-act animation arc. Iterate tempo and label timing.
13. **Act 4 cluster moments.** Three beats: Vignelli legacy → Editorial constellation → Agency lineage. See §Visualization implementation plan for exact choreography.
14. **Polish + export targets.** Decide wall installation vs web vs both. Tune to target medium.
15. **(Later) Layer-3 soft-edge enrichment.** Apify for Instagram mutual-follows / co-tags. Manual curation pass for the rest. The artwork's soul lives in human curation — codify the workflow before automating.

---

## Open questions

- Who else is on the soft-edge curation team? (Decision shapes tool choice.)
- Is the deliverable a wall installation, a public web piece, or both?
- Does the artwork update live, or is it re-published per-event?
- Privacy posture for living people on the soft-edge layer — anything we surface should be drawn from already-public signals, but the *aggregate* portrait is more revealing than any one signal. Worth a written stance before publishing.

---

# Visualization implementation plan

This section is the canonical hand-off spec for the build phase in Claude Code. Read it carefully before writing any code.

## Reference

Gabriele uploaded a 27s reference video (`329_Universe-Org.webm`) — appears to be the "Universe by Org" employee-network visualization. We borrow its visual language and animation arc; we do not copy it.

The reference's five-act structure:

1. **Cosmos (0–3s).** Pure black, scattered tiny stars, one slightly brighter seed node at frame center.
2. **One node wakes (3–7s).** Seed energizes, fine curved edges fan out to first-degree neighbors. Edges are NOT straight — they're quadratic-Bezier arcs with consistent perpendicular offset.
3. **Cascading reveal (7–12s).** BFS-style propagation. Second- and third-degree neighbors illuminate. Sub-clusters begin to materialize.
4. **Full bloom (12–18s).** Network at peak density. Multiple gravitational centers; edges curve like field lines.
5. **Galactic pull-back (18–27s).** Continuous zoom-out. Halo of outlier dots forms a circular containment ring. Reads as a single celestial object.

## Visual recipe

| Element | Spec |
|---|---|
| Background | Pitch black `#000`. No gradient. |
| Member nodes (P001–P014) | **Circles**, larger (~6px radius). Cyan/teal `#5fe6c8` with strong bloom. Co-founders carry a thin outer ring (1px stroke). |
| Guest nodes (P015–P100) | **Circles**, mid-size (~3–4px). White `#ffffff` with soft bloom. |
| Ambient nodes (P101–P139) | **Circles**, smallest (~2px). Pale lavender `#c8c8e0` with minimal bloom. |
| Organization nodes | **Hexagons** (distinct shape from persons). Same color logic as the connected person, slightly muted. Sized by degree. |
| Subject nodes (S01–S09, optional layer) | Dashed-outline circle, no fill. Distinctly "ghosted." |
| Edges, hard (confidence ≥ 0.85) | Curved (quadratic Bezier, perpendicular offset ~15% of chord length). Alpha 0.25. |
| Edges, soft (confidence < 0.85) | Same curve, alpha 0.10, dashed. |
| Edges, Salotto-internal (member↔member, type=`co_member_of_salotto`) | Distinct color — soft gold `#d4af37` at alpha 0.20. The 91 co-membership edges become the connective tissue running through the graph. |
| Glow / bloom | Post-process bloom pass. Threshold ~0.6, intensity ~0.8. Don't overdo. |
| Node bloom shape | Soft circular sprite, exponential alpha falloff (Gaussian-ish). |
| Composition | Additive blending — overlapping edges accumulate brightness rather than mixing colors. This is what makes dense regions look like nebulae. |

## Stack

- **Vite + React + TypeScript** as project scaffolding.
- **`@cosmograph/cosmograph`** as the WebGL graph renderer. Free for non-commercial use; check licensing before public deployment.
- **GSAP** (or Framer Motion) for the animation choreography — the "director" layer that sequences the five acts.
- **Python script** (one-off) to export the Sheet to `network.json`. Uses `openpyxl` to read the xlsx + `networkx` to pre-compute the force-directed layout.

Reject: D3-force in SVG (anemic at 139+ nodes), pure Canvas2D (no additive glow), Sigma.js (works but less artful default), Kumu.io (customization ceiling).

## Data flow

```
salotto_mapping_v0.xlsx
  └── (Python export script: scripts/export_network.py)
       └── viz/public/network.json
            ├── nodes: [{id, name, class (member|guest|ambient|org|subject),
            │             role, member_status, degree, x, y, primary_role}, ...]
            ├── edges: [{source, target, type, confidence, status, evidence_url, kind}, ...]
            └── bfs_order: [P004, P005, P004's neighbors..., ...]
                — seeded from P004 Emiliano Ponzi (highest-degree member, public-facing)
```

The viz reads `network.json` at startup. The director script reads `bfs_order` to drive the reveal animation.

Force-directed layout is pre-computed ONCE in Python (NetworkX `spring_layout` or similar) and the `x,y` are baked into the JSON. Cosmograph receives static positions, not a live simulation — gives consistent composition across reloads.

## The five-act animation script (~90 seconds, looping)

Compressed from 27s (reference video) to ~90s for Salotto because:
- We have 139 nodes, not thousands. Each is meaningful and named.
- Names appear and disappear during the reveal (the reference shows zero text).
- Three cluster focus beats need ~7s each.

### Act 1 — Cosmos (0–8s)

- Black field.
- Light decorative starfield of ~300–500 background-only dots fades in slowly (non-data, non-clickable — purely atmospheric, helps with density).
- At ~5s, **P004 Emiliano Ponzi** pulses into existence as the seed (highest-degree node, most public-facing member).
- Label "Emiliano Ponzi · co-founder" fades in for 2s, fades out.

### Act 2 — Wake-up (8–20s)

- BFS propagation from P004.
- First-degree neighbors (member↔member co-membership edges + Ponzi's external collaborators) light up edge-by-edge over ~6s.
- Each of the 14 Salotto members pulses into visibility with their name briefly visible (1s on, 1s off, staggered).
- Camera stays at full overview.

### Act 3 — Cascading reveal (20–40s)

- Second-degree neighbors. The 91 member↔member co-membership edges illuminate as a connective gold web running through the graph.
- Guest nodes fade in as the BFS wave passes (only ~5 names visible at any one time so the eye can read each).
- Camera nudges to keep the awakened mass framed.

### Act 4 — Cluster moments (40–65s)

Three focus beats, ~7s each.

**Beat 1 — The Vignelli legacy (4s).** Zoom into Ponzi → S02 Massimo Vignelli edge, both labeled, "The Great New York Subway Map (MoMA, 2017)" in microcopy. *Salotto's intellectual lineage.*

**Beat 2 — The editorial constellation (8s).** Camera reframes around the NYT/NewYorker dual hub. Both org-hexagons pulse and label themselves first (org labels styled differently from person labels — italicized + slightly larger). Then a rolling sequence fades in person labels — Ponzi, Mattotti, Blechman, Konrad, Michaelov, Marzorati, Heller, De Agostinis — cascading in pairs every 1s, each pair holding for 2s before fading. Adjacent secondary org-hexagons (Le Monde, Triennale, MoMA-as-publisher, Repubblica, Corriere della Sera, Internazionale, Sole 24 Ore) glow at lower intensity, suggesting "...and beyond." *Salotto's people work with the editors who shape the global cultural conversation.*

**Beat 3 — The agency lineage (8s).** Camera centers on **Pentagram** (the structural pivot — the only multi-member agency). Edges to Lupi (P049) and Fanton (P005) illuminate — the hinge. Then Fanton's other agency affiliations (BBDO, Johannes Leonardo, Collins, Ogilvy, The Partners, Siegel & Gale, The Glue Society, Fabrica) cascade in like petals. Then in parallel, Sagmeister & Walsh and DLV BBDO bloom from Zoavo, Bonaparte and Wieden+Kennedy from Rosella, Design Group Italia from Zangari, Bonsaininja's client portfolio (Timberland, Ray-Ban, Oakley, Pirelli, Luxottica) from Spinelli. By the end of the beat, ~20 agency org-hexagons are visible, each connected to one or two members — a constellation *behind* the constellation. *Before Salotto, they were all already connected — through the agencies.*

**Compositional difference between Beats 2 and 3** is part of the artwork's argument:
- Beat 2 is **bipartite-feeling** — pubs and people, dense crossings between.
- Beat 3 is **starburst structure** — Pentagram center, then satellite starbursts for each other member.

### Act 5 — Galactic pull-back (65–90s)

- Camera smoothly zooms out to encompass the full network plus halo of ambient nodes.
- All edges fade to baseline alpha.
- Names disappear.
- Network reads as a single coherent object.
- Holds 5s. Loops to Act 1.

## Camera moves implementation

GSAP `timeline()` per beat. Each focus-and-return is a sequence:
1. Fade non-focus nodes/edges to ~30% alpha (`gsap.to(material, { alpha: 0.3, duration: 0.5 })`).
2. Animate camera position + zoom to centroid of focus subset (`power2.inOut` ease).
3. Fade focus labels in.
4. Hold.
5. Reverse — restore alphas, return camera to overview.

## First prototype sequence (for Claude Code)

1. **Export script first.** `scripts/export_network.py`: read xlsx → compute layout → write `viz/public/network.json`. Verify output by eye (it's a small file, easy to inspect).
2. **Vite + React + TypeScript skeleton.** `npm create vite@latest viz -- --template react-ts`. Install `@cosmograph/cosmograph`, `gsap`.
3. **Static render.** Read `network.json`, pass to Cosmograph with the visual-spec config. **No animation yet.** Screenshot review with Gabriele before proceeding.
4. **Visual tuning iteration.** Adjust node sizes, edge alphas, palette, glow intensity until the still composition feels right. Several rounds expected.
5. **GSAP director — Acts 1, 2, 5 first.** Reveal, propagation, pull-back. Skip Act 3 and Act 4 for v0.5.
6. **Act 3 — cascading guest reveal.**
7. **Act 4 — the three cluster beats.** Most interpretive work; iterate carefully.
8. **Polish.** Loop transitions, edge cases (what if the BFS hits a disconnected component? What if a label is too long?), performance check on the final dataset.

## Things to keep an eye on during build

- **Density.** 139 nodes is much less than the reference video's thousands. Decorative starfield (Act 1) helps; if the still looks too sparse, lean into the sparseness rather than fighting it — bigger nodes, longer reading time on names.
- **Label collisions.** When ~5 names are visible at once, they will overlap. Cosmograph has label-collision settings; if those aren't enough, write a custom label layer in React on top.
- **Org-node hexagons.** Cosmograph natively renders circles. Hexagons may require either a custom node-renderer extension OR rendering orgs as a separate overlay React layer. Decide early.
- **Loop seam.** Act 5 → Act 1 transition needs to be invisible. Easiest path: hold Act 5's final composition, fade everything to black over 2s, then fade up Act 1's starfield. Doesn't have to be a hard cut.
- **Performance.** 139 nodes is trivial for Cosmograph. Glow + bloom + 90s of animation should run smoothly even on modest hardware. Don't pre-optimize.
