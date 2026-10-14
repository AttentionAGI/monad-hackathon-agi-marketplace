# AttentionAGI

A pocket device for talking to AI agents, and the app that brings them together.

We're building a small rectangular device with a mic, a screen, and BLE. The idea is simple: hold it close, talk, and get help from the agent you've picked. This repo is the companion app for choosing those agents, coming back to conversations, and managing the device.

Prepared for the [Monad Metropolis hackathon](https://hackathon.monad.xyz/).

## The app

The marketplace is the starting point. You can browse agents, filter by what you need, and add one to your library. There are options for notes, language learning, creative work, and coding, including Meta Muse, Codex, Cursor, and Grok Bot.

The rest of the workspace covers what happens after you've picked an agent:

- **Conversations** keeps summaries and transcripts together, with a text export.
- **Storage** lets you choose where conversations should live and how long to keep them.
- **Device** has the actual hardware model in 3D, plus pairing and update screens.
- **Build an agent** lets you download a starter agent spec.

The interface is black and white. It uses Apple's system font on Apple devices, and you can rotate the device model to see it from either side.

## Try it

You'll need Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. No API keys or build step needed.

If that port is taken, run `PORT=5174 npm run dev` on macOS/Linux. On PowerShell, run `$env:PORT=5174` first, then `npm run dev`.

There's also a [hosted preview](https://pocket-agent-studio.sakumaran.chatgpt.site/), but it's private. For judging, run the app locally or deploy it through the included GitHub Pages workflow. [Deployment instructions →](docs/GITHUB.md)

## What works today

Browsing, search, filters, library changes, the 3D viewer, conversation exports, and agent spec downloads all work. Your agent library and settings stay in the browser between visits.

The conversations are samples. Battery level, BLE status, storage usage, ratings, and firmware releases are demo data. The pairing and update screens show the intended flow; they don't talk to hardware yet. The provider cards aren't connected to live agents, and the storage choices don't provision cloud storage.

## Where Monad fits

This repo currently covers the companion app. It doesn't connect a wallet, call a Monad contract, or make onchain payments yet.

An onchain agent marketplace is a possible next step: agent purchases or usage payments on Monad, with conversations kept offchain. That part still needs to be designed and built.

## Working on it

It's plain HTML, CSS, and JavaScript. The app lives in `dist/`; edit the files there and refresh the browser. The name is a little misleading — it's the source we serve, not generated build output.

```text
dist/app.js             App screens, agent catalog, and local state
dist/style.css          Layout and styling
dist/device-viewer.js   3D viewer and fallback images
dist/assets/            Hardware model, logos, and bundled viewer
scripts/server.mjs      Local dev server
tests/                  Server tests
docs/                   Demo notes, architecture, and GitHub setup
```

Before pushing:

```bash
npm run check
npm test
```

GitHub Actions runs the same checks. Tests cover serving the app and its assets, content types, and keeping requests inside the public directory.

## Next up

The first hardware milestone is pairing a real device over BLE and getting a conversation through a companion bridge. After that: live agent connections, saved conversations, storage that respects the selected retention period, and signed firmware updates.

[Technical notes](docs/ARCHITECTURE.md) · [Demo walkthrough](docs/DEMO.md) · [GitHub setup](docs/GITHUB.md)

## Credits

The device model and reference images come from our hardware project. The viewer is Google model-viewer 4.4.0. Brand artwork sources are in [the logo notes](dist/assets/logos/SOURCES.md); the marks belong to their respective owners and don't imply a partnership.

We haven't selected an open-source license for our application code yet. Dependency licenses and asset credits are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
