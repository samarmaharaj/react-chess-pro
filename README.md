# React Chess Pro

A full‑featured chess web app that lets you **play vs AI** (Stockfish WASM in a Web Worker) or **play online with a friend** via a simple P2P flow. Built with **React + Vite + TypeScript** and tuned to be smooth on phones and desktops.

## ✨ Features
- **AI opponent** — runs entirely in the browser (no server/API keys)
- **Peer-to-peer friend match** (optional; add-on provided)
- Legal moves, checks, checkmate via `chess.js`
- Clean, responsive UI with `react-chessboard`

## 🛠 Run Locally
```bash
npm install
npm run dev
# build
npm run build
npm run preview
```

## 🌐 Deploy (pick one)
**Vercel**: Import repo → Framework: Vite → Deploy.  
**Netlify**: Build `npm run build`, Publish `dist`.  
**GitHub Pages**:
```bash
npm run build
npm run deploy
# then GitHub → Settings → Pages → select gh-pages branch
```

> `vite.config.ts` already includes `base: '/react-chess-pro/'` for GitHub Pages.

## 📱 Smooth on All Devices
- AI in a **Web Worker** (`stockfish.worker.js`)
- Limit default AI depth on small screens; offer a settings slider
- Debounce engine searches (only after move is dropped)
- Avoid unnecessary re-renders (memoize props; single `chess.js` instance)

## 🧑‍🤝‍🧑 Online Play (Optional Add‑On)
Drop-in service included at `services/onlineService.ts` (using PeerJS). To enable:
```bash
npm i peerjs uuid
```
Wire it in your UI to create/join a room by code and exchange moves over a WebRTC DataChannel.

## 📸 Screenshot
Place an image in the repo root and reference it:
```md
![App Screenshot](screenshot.png)
```

## 📝 License
MIT
