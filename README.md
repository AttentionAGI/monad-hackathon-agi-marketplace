# AttentionAGI companion marketplace

A responsive, buildless web prototype for a pocket AI device. Run `npm run dev` and open http://localhost:5173. Run `npm run check` to verify JavaScript syntax.

Includes agent search, categories, sorting, a persistent local agent library, sample conversation summaries and transcript exports, storage/retention preferences, a pairing form, a firmware update preview, and downloadable agent draft specifications.

The prototype uses browser localStorage for preferences. No real microphone capture, authentication, AI execution, cloud conversation hosting, payments, device pairing, or firmware delivery is connected. These require production services and a documented device API. Sample conversations and device status are demonstration data.

Production integration should add authenticated user/device identities, an agent runtime and catalog API, conversation transcription and object storage, account-controlled retention, device pairing tokens, and signed firmware manifests with device-side verification and rollback.

## 3D device preview

The supplied `attentionagi-device.glb` is displayed using Google model-viewer 4.4.0, vendored under `dist/assets/vendor/` with its license. Drag or use arrow keys to rotate, scroll/pinch to zoom, or use Front, Back, and 3D view shortcuts. Reference images remain available if WebGL or model loading fails.

The workspace uses a slate grey, midnight blue, and black palette while agent artwork keeps individual colors. Meta Muse, Codex, Cursor, and Grok Bot are demo catalog options; provider services are not connected. Meta Muse is a requested concept, with provider details not yet defined.
