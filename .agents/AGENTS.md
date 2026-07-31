# Project Guidelines

## Wails / Go Build & AV Protection Rules
- Always compile `etnet_go` using the new standard method: `wails build -clean -trimpath` (in `c:\ai\etnet\etnet_go`).
- Do NOT use raw `go build` directly without `wails build`, as raw builds lack official Wails Windows manifest/resource embedding and get flagged/deleted by Windows Defender / AV solutions.
- Always include `-trimpath` to strip local filesystem paths (`C:\Users\...`) from the binary.
- Uses Wails' new standard Go WebView2Loader (omitting legacy `-tags native_webview2loader`).
- Always stop any running `ETNet_Live_Stock.exe` process before building/copying to avoid process lock conflicts.
- Keep native window borders/heading bar intact (do not set `Frameless: true` unless explicitly requested).
