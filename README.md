# Split

A full-screen reaction trainer for badminton split-step reads. A laptop sits on the court. The court stays blank, then an arrow calls a direction: left, right, back, the diagonals, or forward toward the net. Gaps are uneven. A cue can flash up to three feints first. The real arrow is the one that counts.

Cues run on their own. Key and tap answers stay available in Settings, off by default. Record reactions is on by default: the laptop camera saves one clip per cue in this browser, with the real direction and the feints, so you can review the movement later. Nothing is uploaded. Arrow and background colors are inside Settings. The drill won't start if the pair is too close to read.

## Run it

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
npm run build
```
