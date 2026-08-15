# HSI Stock Quote via ETNet — DeepSeek Harness Plugin Package

Packages the ETNet scraping logic from the **hsi_stock** project as a persistent
DeepSeek Harness (Cordis) plugin. Ask any agent on the `hsi-stock` preset
*"what's the HSI right now?"* or *"quote 2513"* and it answers with live data
scraped from ETNet HK (`www.etnet.com.hk`).

> ⚠️ **Disclaimer** — same as the parent project: data is captured live from
> ETNet's public pages for personal/educational use. Not affiliated with ETNet;
> no responsibility for accuracy or use in trading decisions.

---

## What it provides

| Surface | Name | What you get |
|---|---|---|
| Model tool | `etnet_quote` | `{ code }` → live HK stock/ETF quote (name, price, change, high/low, volume, turnover, prev-close, open, 1-month & 52-week range, market cap, short-sell, `marketOpen`) |
| Model tool | `etnet_hsi` | `{}` → HSI snapshot (恒指 value/change, 期指 futures value/change, session high/low, 52-week high/low; pre-9:30 headline = 期指, after = 恒指) |
| Service | `etnet` | `etnet.quote(code)` / `etnet.hsi()` for programmatic use by other plugins |
| Host seam | `web.fetch` | Registers a curl-backed `http` fetch provider on `ctx.web`, making `web.fetch` work in deployments that ship no fetch provider |

## Package structure

```
harness-plugin/
├── README.md                     ← this file
├── hsiq-plugin.mjs               ← the plugin module (single source of truth,
│                                   zero npm imports — runs anywhere)
└── preset/
    └── hsi-stock/                ← reference copy of the installed preset
        ├── preset.yml            ← display metadata
        ├── agent.cordis.yml      ← composition (standard + the ETNet group)
        └── hsiq-plugin.mjs       ← copy of the plugin module
```

## How it's wired (persistent)

A locally authored agent preset is installed at
`~/.dsh/.agent-presets/hsi-stock/` (the deployment's user preset root):

```
agent.cordis.yml
└── - id: hsiq-etnet            (cordis:group)
      isolate: { etnet: true }   ← etnet service stays private to the session
      config:
        - id: hsiq-etnet-plugin
          name: ./hsiq-plugin.mjs   ← loaded relative to the preset dir
```

The plugin module is **zero-import** (no `@deepseek-ai/*` bare specifiers), so
it resolves from the preset directory without needing the harness checkout's
`node_modules`. All side effects (fetch provider, `etnet` service, two tools)
are fiber-owned and unwound on stop via `ctx.on('dispose')`.

## How to use it

1. In the harness, **start a new session on the `hsi-stock` preset**.
2. Ask in natural language:
   - *"what's the HSI right now?"* → calls `etnet_hsi`
   - *"quote for 00700"* → calls `etnet_quote`
3. Or call the tools directly if your client exposes them.

The preset is a full `standard` coding agent, so every normal capability
(bash, files, web search, subagents, workflows) is present **plus** the ETNet
tools.

## Reinstall / recovery

- **After a harness restart** — nothing to do: the preset persists on disk and
  auto-mounts the plugin the first time a session starts on it.
- **Reset the preset** (restores the pristine `standard` copy + ETNet group):
  ```bash
  rm -rf ~/.dsh/.agent-presets/hsi-stock
  ```
  then ask a harness agent to re-run the packaging steps in
  `hsi_stock` (`harness-plugin/preset/hsi-stock/` holds the exact files).
- **Dynamic reinstall (no preset)** — the same `apply()` logic can be replayed
  through the dynamic Cordis tools (`cordis_define` + `cordis_run`) if you want
  the capability only for one live process; ask the harness agent to do it.

## How the logic maps to the hsi_stock project

| hsi_stock (Go/Node) | This plugin |
|---|---|
| `axios`/`goquery` scraper | `web.fetch` → curl via the `shell` service (the harness sandbox has no raw `fetch`) |
| `#StkQuoteHeader`, `#StkDetailMainBox`, `td.styleB` selectors | same structure, regex/string extraction (no cheerio in the sandbox) |
| ETF redirect `/www/tc/etf/quote/…` | kept as a legacy fallback; current ETF pages use the unified quote layout |
| `handleHSI` futures/HSI regex + pre-9:30 rule | ported verbatim: `<9:30 → 期指 headline`, `≥9:30 → 恒指 only` |
| `indexes_detail.php` high/low | ported (matches `最高　`/`最低　` incl. ideographic spaces) |
| 52-week range | parsed from the home card sparkline `data-sparkline_min/max` |

## Notes & limitations

- After HK market close, ETNet returns empty placeholders — quotes come back
  with `marketOpen: false` and blank price fields (not a parse failure).
- The scraper is coupled to ETNet's live HTML; if their layout changes, field
  extraction returns empty strings and the `ok`/`error` fields flag it.
- The curl-backed provider needs `curl` on the host (present on macOS and
  Windows).
