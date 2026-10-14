# How it's put together

The companion app is a static site. We kept the stack small: HTML, CSS, JavaScript, and a Node dev server. There's no bundler and no backend to start.

`dist/index.html` loads the app. `app.js` handles the screens, catalog, dialogs, and preferences. Those preferences are saved in `localStorage` under `pocket-workspace`.

`device-viewer.js` loads Google's model-viewer and our GLB. If the model can't load or the browser can't render it, we show a reference image instead. The viewer, model, and logos are bundled locally.

The server in `scripts/server.mjs` serves `dist/`. It's for local development; it doesn't handle accounts or API requests.

## Connecting the hardware

The device uses BLE. We'll need to define its GATT services and the messages that carry audio, commands, and status. A phone or native companion can bridge that connection to the agent services. Direct browser BLE support isn't something the app currently relies on.

Pairing will need a short-lived challenge and an account-to-device association. The pairing screen in this repo doesn't implement that protocol yet.

## Agents and conversations

Live agents need provider adapters, authentication, and a voice pipeline. The names in the catalog are options to explore, not working integrations.

For conversation hosting, we'll need a database for transcripts and summaries, plus object storage if we keep audio. The selected storage destination and retention period need to be enforced by those services. Right now they're saved preferences.

## Updates

The update flow needs a signed release manifest, a BLE transfer through the companion, device-side signature checks, and a way to recover from a failed update. The current screen is just a preview.

## Monad

There is no wallet connection or smart contract code in this repository. A future payment layer could handle agent purchases or usage on Monad. Conversations would stay offchain. We haven't chosen a contract design or implemented that flow.

## Hosting

Any static host can serve `dist/`. Asset paths are relative, so GitHub Pages project URLs work too.

The included Pages workflow runs manually. The existing private preview uses Sites; `.openai/hosting.json` links that deployment and isn't needed to run or host your own copy.
