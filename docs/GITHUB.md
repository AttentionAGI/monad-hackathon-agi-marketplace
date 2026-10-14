# GitHub and a public demo

The project root is the folder containing `package.json` and the README. Use that folder when uploading or pushing.

## Upload the ZIP

Create an empty repository, extract `attentionagi-hackathon.zip`, and upload the contents of the extracted `attentionagi` folder. The README should be at the repository root, not inside another folder.

Include the hidden files, especially `.github/` and `.gitignore`. If your browser skips them, use Git instead.

The ZIP leaves out Git history and the existing private Sites configuration. To turn an extracted copy into a local Git repo, run `git init -b main`.

## Push with Git

Create an empty GitHub repo without adding a README first. From this project folder:

```bash
git status
git add .
git commit -m "Prepare AttentionAGI for Metropolis"
git remote -v
```

If there's no `origin`, add the URL GitHub gives you:

```bash
git remote add origin https://github.com/YOUR_USERNAME/attentionagi.git
git push -u origin HEAD:main
```

Use your own username and repo name. If an `origin` already exists, check where it points before changing it.

## Give judges a link they can open

The current Sites preview is private. GitHub Pages is a straightforward way to host this static demo:

1. In the repo's **Settings → Pages**, choose **GitHub Actions** as the source.
2. Open **Actions → Publish demo to GitHub Pages** and run the workflow on your branch.
3. Once it finishes, use the URL in the deployment output.

Depending on your GitHub plan, the repo may need to be public for Pages. Ordinary pushes run checks; they don't publish the site. The Pages workflow publishes `dist/` when you run it manually.

Try the judging link in a signed-out browser before submitting it. The demo still uses sample conversations and local preferences; hosting it doesn't connect the hardware or backend.
