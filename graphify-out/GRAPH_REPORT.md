# Graph Report - .  (2026-08-04)

## Corpus Check
- 48 files · ~57,701 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 612 nodes · 1480 edges · 50 communities (37 shown, 13 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 186 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Bundled JS Minified Fns A
- Bundled JS Minified Fns B
- Production JS Bundle Index
- Bundled JS Minified Fns C
- Bundled JS Minified Fns D
- Frontend Package Config
- Bundled JS Minified Fns E
- Frontend Entry & ETNet Docs
- Wails Runtime Package Meta
- Backend Dependencies
- Backend Server Package
- Bundled JS Minified Fns F
- Go HTTP Server & Handlers
- Bundled JS Minified Fns G
- Bundled JS Minified Fns H
- OxLint Config Rules
- Bundled JS Minified Fns I
- React Scheduler Internals
- Bundled JS Minified Fns J
- Bundled JS Minified Fns K
- Bundled JS Minified Fns L
- Wails Project Config
- Wails Runtime TypeScript Types
- Social Media Icon Set
- App Visual Identity
- Price Path Checker
- Express Server App
- Cheerio Selector Probe
- Dynamic Content Probe
- DOM Elements Probe
- Header Parent Probe
- Lines Text Probe
- Main Box Probe
- PHP Links Probe
- Price Location Probe
- Skinner Text Probe
- API Test Harness
- Wails Event Bindings
- App Screenshots
- Hero Image
- React Logo
- HSI Stock Binary

## God Nodes (most connected - your core abstractions)
1. `i()` - 73 edges
2. `n()` - 51 edges
3. `t()` - 37 edges
4. `r()` - 36 edges
5. `fc()` - 36 edges
6. `a()` - 33 edges
7. `wd()` - 26 edges
8. `o()` - 23 edges
9. `tc()` - 21 edges
10. `vc()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Go Desktop Build index.html (Embedded)` --semantically_similar_to--> `Frontend index.html (Vite Entry)`  [INFERRED] [semantically similar]
  hsi_stock_go/frontend_dist/index.html → frontend/index.html
- `App()` --indirect_call--> `a()`  [INFERRED]
  frontend/src/App.jsx → hsi_stock_go/frontend_dist/assets/index-RHIwInH7.js
- `App()` --indirect_call--> `b()`  [INFERRED]
  frontend/src/App.jsx → hsi_stock_go/frontend_dist/assets/index-RHIwInH7.js
- `App()` --indirect_call--> `c()`  [INFERRED]
  frontend/src/App.jsx → hsi_stock_go/frontend_dist/assets/index-RHIwInH7.js
- `App()` --indirect_call--> `v()`  [INFERRED]
  frontend/src/App.jsx → hsi_stock_go/frontend_dist/assets/index-RHIwInH7.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Vite Frontend Build Pipeline: Source index.html -> Bundled JS/CSS -> Embedded in Go Binary** — frontend_index_html, frontend_index_html_main_jsx, hsi_stock_go_frontend_dist_index_html, hsi_stock_go_frontend_dist_bundled_js, hsi_stock_go_frontend_dist_bundled_css, readme_go_binary_embed_fs [INFERRED 0.85]
- **ETNet Data Flow: Scraped HTML -> Stock Quote Data -> Dashboard Visualization** — backend_raw_html, backend_raw_html_stock_quote_data, readme_etnet_hk_data_source, readme_split_svg_chart [INFERRED 0.75]
- **App Visual Identity Assets** — frontend_public_favicon_favicon, hsi_stock_go_frontend_dist_favicon_favicon, hsi_stock_go_icon_appicon [INFERRED 0.75]
- **Frontend Framework Logos** — frontend_src_assets_vite_vitelogo, frontend_src_assets_react_reactlogo [EXTRACTED 1.00]

## Communities (50 total, 13 thin omitted)

### Community 1 - "Bundled JS Minified Fns A"
Cohesion: 0.10
Nodes (64): a(), ae(), at(), b(), bd(), bi(), c(), cd() (+56 more)

### Community 2 - "Bundled JS Minified Fns B"
Cohesion: 0.07
Nodes (40): ad(), Bt(), bu(), Ed(), fd(), fr(), Gd(), gn() (+32 more)

### Community 3 - "Production JS Bundle Index"
Cohesion: 0.08
Nodes (18): Ao(), ct(), df(), _e(), $f(), gs(), Hd(), hs() (+10 more)

### Community 4 - "Bundled JS Minified Fns C"
Cohesion: 0.09
Nodes (33): aa(), ac(), af(), cf(), Da(), dc(), Du(), Ea() (+25 more)

### Community 5 - "Bundled JS Minified Fns D"
Cohesion: 0.15
Nodes (30): bc(), be(), ca(), cc(), cn(), co(), Do(), eo() (+22 more)

### Community 6 - "Frontend Package Config"
Cohesion: 0.08
Nodes (25): dependencies, react, react-dom, devDependencies, oxlint, @types/react, @types/react-dom, vite (+17 more)

### Community 7 - "Bundled JS Minified Fns E"
Cohesion: 0.13
Nodes (25): ap(), ba(), bs(), dd(), di(), ds(), fi(), fs() (+17 more)

### Community 8 - "Frontend Entry & ETNet Docs"
Cohesion: 0.11
Nodes (22): ETNet Scraped Stock Quote Page (2513.HK), Stock Quote Data Structure (ETNet HTML), Frontend index.html (Vite Entry), main.jsx Entry Module, React Root div#root, React + Vite Frontend README, React Compiler, Vite React Plugin (Oxc) (+14 more)

### Community 9 - "Wails Runtime Package Meta"
Cohesion: 0.11
Nodes (18): author, bugs, url, description, homepage, keywords, license, main (+10 more)

### Community 10 - "Backend Dependencies"
Cohesion: 0.11
Nodes (17): dependencies, axios, cheerio, cors, express, description, axios, cheerio (+9 more)

### Community 11 - "Backend Server Package"
Cohesion: 0.12
Nodes (16): dependencies, axios, cheerio, cors, express, description, axios, cheerio (+8 more)

### Community 12 - "Bundled JS Minified Fns F"
Cohesion: 0.19
Nodes (16): as(), Bo(), cs(), ks(), ms(), os(), ss(), Uo() (+8 more)

### Community 13 - "Go HTTP Server & Handlers"
Cohesion: 0.25
Nodes (14): Document, HandlerFunc, HsiResponse, enableCORS(), handleHSI(), handleQuote(), main(), parseETF() (+6 more)

### Community 14 - "Bundled JS Minified Fns G"
Cohesion: 0.19
Nodes (15): Al(), bl(), dl(), el(), fl(), ha(), Il(), kl() (+7 more)

### Community 15 - "Bundled JS Minified Fns H"
Cohesion: 0.17
Nodes (15): ef(), gf(), gl(), Hf(), hl(), If(), jf(), kf() (+7 more)

### Community 16 - "OxLint Config Rules"
Cohesion: 0.18
Nodes (10): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, App(), y(), oxc (+2 more)

### Community 17 - "Bundled JS Minified Fns I"
Cohesion: 0.18
Nodes (13): cp(), Cr(), dp(), gr(), lp(), Tr(), un(), up() (+5 more)

### Community 18 - "React Scheduler Internals"
Cohesion: 0.19
Nodes (12): dt(), Fu(), ip(), Iu(), lt(), mu(), ns(), op() (+4 more)

### Community 19 - "Bundled JS Minified Fns J"
Cohesion: 0.36
Nodes (11): Au(), ci(), Cu(), et(), Eu(), ku(), Ou(), rd() (+3 more)

### Community 20 - "Bundled JS Minified Fns K"
Cohesion: 0.25
Nodes (11): cl(), ia(), kc(), ml(), nl(), no(), pl(), ra() (+3 more)

### Community 21 - "Bundled JS Minified Fns L"
Cohesion: 0.18
Nodes (11): De(), Ee(), Ei(), it(), ju(), nt(), qu(), rc() (+3 more)

### Community 22 - "Wails Project Config"
Cohesion: 0.22
Nodes (8): author, name, frontend:build, frontend:install, name, outputfilename, $schema, version

### Community 23 - "Wails Runtime TypeScript Types"
Cohesion: 0.25
Nodes (7): EnvironmentInfo, NotificationAction, NotificationCategory, NotificationOptions, Position, Screen, Size

### Community 24 - "Social Media Icon Set"
Cohesion: 0.33
Nodes (6): Bluesky Icon, Discord Icon, GitHub Icon, Social Icon Set (bluesky, discord, github, x, documentation, social), X (Twitter) Icon, Production Social Icon Set

### Community 25 - "App Visual Identity"
Cohesion: 0.40
Nodes (5): App Favicon (purple Vite-style bolt), Vite Bolt Mark, Vite Logo (purple bolt with parentheses), Production App Favicon (purple bolt), Go Desktop App Icon (icon.png)

### Community 26 - "Price Path Checker"
Cohesion: 0.67
Nodes (3): getPath(), html, $

### Community 27 - "Express Server App"
Cohesion: 0.50
Nodes (3): app, __dirname, __filename

### Community 38 - "Wails Event Bindings"
Cohesion: 0.67
Nodes (3): EventsOn(), EventsOnce(), EventsOnMultiple()

### Community 39 - "App Screenshots"
Cohesion: 0.67
Nodes (3): App Screenshot 1 - main view (2026-07-31 10:36), App Screenshot 2 - view (2026-07-31 10:37), App Screenshot 3 - view (2026-07-31 10:40)

## Knowledge Gaps
- **109 isolated node(s):** `html`, `$`, `html`, `$`, `html` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `OxLint Config Rules` to `Bundled JS Minified Fns A`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `i()` (e.g. with `bc()` and `cc()`) actually correct?**
  _`i()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `n()` (e.g. with `at()` and `bd()`) actually correct?**
  _`n()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `t()` (e.g. with `ap()` and `bd()`) actually correct?**
  _`t()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `r()` (e.g. with `at()` and `bd()`) actually correct?**
  _`r()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **What connects `html`, `$`, `html` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Wails JS Runtime API` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._