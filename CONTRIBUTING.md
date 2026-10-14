# Working on AttentionAGI

Use Node.js 22 or newer:

```bash
npm ci
npm run dev
```

Edit the app directly in `dist/` and refresh the page. There's no build step.

Before opening a PR, run:

```bash
npm run check
npm test
```

If you've changed the UI, try it at desktop and phone widths. Check that keyboard navigation still works and that the device has a useful fallback when 3D isn't available.

Keep sample data and unfinished integrations labeled. If you add an asset or dependency, add its source and license to the credits. Don't commit API keys or other credentials.
