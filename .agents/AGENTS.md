# Project Guidelines

## Wails / Go Build & AV Protection Rules
- Always compile `etnet_go` using standard `wails build -clean -trimpath` (in `c:\ai\etnet\etnet_go`).
- Do NOT use raw `go build` directly without `wails build`, as raw builds lack official Wails Windows manifest/resource embedding and get flagged/deleted by Windows Defender / AV solutions.
- Always include `-trimpath` during `wails build` to strip local filesystem paths from the binary, reducing heuristic false positives from antivirus scanners.
- Always stop any running `ETNet_Live_Stock.exe` process before building/copying to avoid process lock conflicts.
- Keep native window borders/heading bar intact (do not set `Frameless: true` unless explicitly requested).
