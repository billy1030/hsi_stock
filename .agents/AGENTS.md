# Project Guidelines

## Wails / Go Build & AV Protection Rules
- Always compile `etnet_go` using `wails build -clean -trimpath -tags native_webview2loader -ldflags "-s -w"` (in `c:\ai\etnet\etnet_go`).
- Do NOT use raw `go build` directly without `wails build`, as raw builds lack official Wails Windows manifest/resource embedding and get flagged/deleted by Windows Defender / AV solutions.
- Always include `-trimpath` to strip local filesystem paths (`C:\Users\...`) from the binary.
- Use `-tags native_webview2loader` and `-ldflags "-s -w"` to bypass experimental Go WebView2Loader heuristic flags and strip debug symbol noise, reducing antivirus false positives.
- Always stop any running `ETNet_Live_Stock.exe` process before building/copying to avoid process lock conflicts.
- Keep native window borders/heading bar intact (do not set `Frameless: true` unless explicitly requested).
