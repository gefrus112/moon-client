# 🌙 Moon Client

**A better client for Roblox optimization.**

Moon Client is a free, lightweight launcher that tunes Roblox for speed — higher FPS, lower input latency, and a clean, fast UI. No paywalls, no ads, no bundled junk. Open source under the MIT license.

## ✨ Features

- ⚡ **FPS Boost** — proven graphics/engine tweaks for more frames
- 🎯 **Low Latency** — optimized launch flags and process cleanup
- 🧠 **Memory Optimizer** — trims unnecessary background processes
- ✨ **Clean, fast UI** — launch, optimize, play in two clicks
- 🔄 **Auto Updates** — checks GitHub Releases on startup
- 🔓 **Free & open source** — full source on GitHub, MIT license

## ⬇️ Download

Grab the latest `MoonClient.exe` from [**GitHub Releases**](https://github.com/gefrus112/moon-client/releases) — no installer required. Just run it and hit **Launch Roblox**.

**System requirements:** Windows 10/11 (64-bit), Roblox Player installed, ~50 MB disk space.

## 🌐 Website

The marketing site lives in [`website/`](website/) — a dependency-free static page with a **Three.js** hero scene (custom `moon.glb` model: cratered low-poly moon + orbit ring + floating blocks), a **Roblox profile lookup** (shows *your* profile only — avatar, stats, and games you've created), and a **Roblox game search** with full detail modals, all powered by Roblox's public APIs from the browser.

Run it locally:

```bash
cd website
python3 -m http.server 3000 --bind 0.0.0.0
# open http://localhost:3000
```

Three.js (r160) is vendored under `website/vendor/` so the site works fully offline — no CDN required.

## 🛠️ Building the client

The client is a .NET 8 WinForms app in [`MoonClient.App/`](MoonClient.App/). CI (`.github/workflows/build.yml`) builds a self-contained Windows x64 EXE on every push to `main` and attaches it to GitHub Releases on version tags (`v*`).

```powershell
dotnet publish MoonClient.App/MoonClient.App.csproj `
  --configuration Release --runtime win-x64 --self-contained true `
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
  --output publish
```

## 📁 Repo structure

```
MoonClient.App/      C# launcher (launch, optimize, update check)
website/             Static site (Three.js + GLB, profile lookup, game search)
  index.html
  css/style.css
  js/                three-scene.js · roblox.js · github.js · main.js
  models/moon.glb    Custom 3D model
  vendor/            Three.js r160 (vendored, offline-friendly)
.github/workflows/   Windows build + release automation
```

## ⚠️ Disclaimer

Not affiliated with Roblox Corporation. Roblox and the Roblox logo are trademarks of Roblox Corporation. Moon Client only launches Roblox with optimization flags and adjusts user-level settings — it never modifies game files, injects code, or asks for your password, cookies, or Robux. Game/profile data comes from Roblox's public APIs.
