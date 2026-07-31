# HSI Stock & Chart Dashboard

> [!WARNING]
> **Disclaimer & Legal Notice**
> This project is created strictly as an experimental testing experience for AI-assisted "vibe coding" and personal educational exploration.
> - **Data Sourcing**: All stock information and index data displayed by this application are captured directly from **ETNet HK** (`www.etnet.com.hk`). This application is not affiliated with, endorsed by, or officially connected to ETNet HK.
> - **Limitation of Liability & Legal Risk**: The developer accepts **no responsibility or liability** for the accuracy, timeliness, completeness, or reliability of any data retrieved, nor for any financial decisions, trading actions, or legal consequences arising from the use of this software. **Users assume all legal risks, responsibilities, and compliance obligations** associated with running this tool or consuming data fetched from third-party sources.

A unified single-port application that captures real-time stock details from ETNet HK, visualizes price and volume histories in a custom split SVG chart, and offers a highly-optimized Mini Mode Watchlist widget.

## 🔄 Evolution: From Node.js/React (v1) to Native Go (v2)

### **Version 1: Node.js & Express + React Architecture**
The initial version of this application was designed as a full-stack web app featuring a Node.js/Express backend that handled HTML scraping (`axios` + `cheerio`) and served a modern React frontend compiled with Vite. While functional and modular, running Version 1 required an installed Node.js runtime environment, launching local server ports (`3300`), installing hundreds of megabytes of `node_modules` dependencies, and manually navigating through an external web browser.

### **Version 2: Rebuilt with Go & Wails (WebView2)**
To drastically improve portability, execution speed, and user experience, the backend logic was completely rewritten in **Google Go** and paired with **Wails v2** (leveraging native OS WebView2). The compiled React UI frontend is embedded directly into the Go binary at compile-time using Go's native `embed.FS`.

### **💡 Key Benefits of the Go Desktop Build**
* ⚡ **Zero External Dependencies (Zero Node.js / npm needed)**: The entire application—backend server logic, HTML parser (`goquery`), and frontend UI assets—compiles into a single standalone `.exe` binary (~17 MB). Users can launch and use it out-of-the-box on any Windows machine without installing Node.js, npm, or extra runtimes.
* 📦 **Instant Startup & Low Resource Footprint**: Unlike Electron apps which package heavy Chromium binaries (often 150MB+), the Go + Wails architecture uses the built-in Windows WebView2 runtime. This results in minimal RAM usage (~30-50 MB vs 300MB+ in Electron) and sub-second cold starts.
* 🖥️ **Pure Native Desktop Experience**: Runs as an isolated native Windows desktop application window (with customizable dimensions, window controls, and embedded app icons), eliminating the need to launch or manage browser tabs.
* 🔒 **Self-Contained & Ultra-Portable**: Everything lives inside a single executable (`HSI_Stock.exe`), making it ideal for running off USB flash drives or deploying across multiple devices effortlessly.

## 📸 Screenshots

| Full Mode | Mini Mode (Watchlist) | Mini Mode (Graph) |
| :---: | :---: | :---: |
| ![Full Mode](image/Screenshot%202026-07-31%20104000.png) | ![Mini Mode Watchlist](image/Screenshot%202026-07-31%20103740.png) | ![Mini Mode Graph](image/Screenshot%202026-07-31%20103654.png) |

## 🚀 Features

*   **Split Stock & ETF Chart**: Professional SVG chart displaying price trends (top pane) and dynamic volume bars (bottom pane) with full time stamps on the X-axis and Y-axis scale values.
*   **ETF Redirect Support**: Seamlessly scrapes and parses ETF quotes (e.g., `7709`, `3033`) by dynamically detecting and following ETNet's JavaScript redirect pattern (pointing to dedicated `/www/tc/etf/quote/` pages).
*   **Mini Mode Watchlist**:
    *   Saves up to 20 stocks/ETFs in local browser storage (`localStorage`).
    *   Lists items vertically in a clean CSS grid layout.
    *   Aligned to match the standard dashboard width (`480px` and centered) for a consistent viewing experience.
    *   Shows live high/low columns with single-character Chinese labels (`高` / `低`) and current prices that update automatically in the background every 30 seconds.
    *   **Interactive Sorting**: Sort watchlist items dynamically by **Stock Code**, **Company Name**, **Price**, or **Change %** in ascending/descending order via clickable table header columns or the top `Sort ↕` cycle button.
    *   Includes a **Clean All** button to clear the cached watchlist and active monitors at once.
    *   **Position Lock**: Selecting a stock by clicking its row highlights it without shifting its order in the watchlist.
*   **Clean Input Box**: Removed default browser autocomplete popups (datalists) to prevent interface clutter, while keeping keystroke decoupling (press **Enter** to submit).
*   **Dual Color Themes**: Day Mode (light slate-blue style with a soft light-blue selected item background) and Night Mode.
*   **State Persistence**: Automatically remembers and loads your last active stock or ETF when you reopen the page.

---

## Support / Donations

If this project saved you a few minutes of typing every day, consider buying me a coffee ☕ — it keeps the project alive and pays for the test devices.

[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/billy1030)

---

## 🛠️ How to Run

### Option 1: Native Desktop App (Go + Wails) ⚡

A self-contained native desktop app built with **Go** and **Wails v2** (leveraging native OS WebView / WebView2). No Node.js runtime or external web browser required!

* **Windows Executable & Build Script**:
  Run the automated PowerShell build script or compile manually:
  ```powershell
  cd hsi_stock_go
  .\build.ps1
  ```
  Or using Wails CLI directly:
  ```bash
  cd hsi_stock_go
  wails build -clean -trimpath
  ```

* **macOS (Apple Silicon & Intel)**:
  Build native macOS desktop app bundle or binary directly on macOS:
  ```bash
  cd hsi_stock_go
  
  # macOS App Bundle (recommended)
  wails build

  # Or standalone macOS binary via Go CLI:
  go build -tags desktop,production -o HSI_Stock_mac .
  ```

---

### Option 2: Node.js / Express Web Server 🌐

Running the web server version requires Node.js:

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the server**:
    ```bash
    npm start
    ```
3.  **Open in Browser**:
    Visit [http://localhost:3300/](http://localhost:3300/) to access the dashboard.

---

## 📁 Project Structure

*   `/hsi_stock_go`: Standalone native Go + Wails desktop application (`main.go`, `go.mod`, `build.ps1`, embedded web assets).
*   `/backend`: Node/Express web server proxying requests to ETNet and serving built React files.
*   `/frontend`: React client UI built using Vite.
*   `package.json` (root): Launches the single-port Express server serving port `3300`.
*   `.gitignore`: Keeps the repository clean by ignoring `node_modules`, builds, and temp logs.
