# Demo notes

A short walkthrough for the Metropolis submission. Aim for about three minutes.

Run `npm run dev` before recording. A fresh browser profile gives you the default agent library.

## Start with the device

Show the hardware model and rotate it. Explain the idea: a small device you can hold close to speak to an agent, with BLE connecting it to a companion.

Then show the app. It's where someone chooses what their device can do and manages the conversations they want to keep.

## Pick an agent

Open the Coding filter, look at Codex or Cursor, and add one to the demo library. Switch to My agents to show that it's there.

These are catalog previews. Don't describe them as live provider connections.

## Come back to a conversation

Open a sample conversation. Show the summary and transcript, then export it as text. This is the experience we're building toward once the audio and agent services are connected.

## Show the controls

Change a storage destination and retention period. Then open Device and walk through the firmware update preview.

The choices persist locally. Storage provisioning, BLE pairing, and firmware delivery are still to be connected.

## Close with what's next

The immediate next step is a real BLE conversation through the companion bridge. The Monad piece would be agent purchases or usage payments; there are no contracts or wallet interactions in this repo yet.

Keep the distinction clear: the hardware is part of the project, this repo is the working companion UI, and the backend and onchain pieces are still ahead.
