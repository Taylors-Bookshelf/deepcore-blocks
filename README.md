# Deepcore Blocks

**[Play it here](https://taylors-bookshelf.github.io/deepcore-blocks/)** (best on a phone: open the link, then Add to Home Screen).

A mining block puzzle. Drag sets of three pieces onto an 8×8 board, clear rows and columns, and dig through a new 20-board world map every day: from the forest surface down through stone caves, deep stone and the gem depths to the Underworld. Smelt the ore you find into special blocks at the anvil.

It's a static web app: no build step, no server code, no runtime dependencies.

## Run it locally

```bash
npm start          # serves http://localhost:8080
```

Or open `index.html` directly in a browser (everything works except offline install).

## Test

`npm test` runs the rules, map, smoke, touch, flow, gate and soak tests; `npm run test:balance` runs the (slow) balance simulation.

```bash
npm install
npx playwright install chromium
npm test
```

## Work on it with Claude Code

```bash
cd deepcore-blocks
git init && git add . && git commit -m "Deepcore Blocks prototype"
claude
```

`CLAUDE.md` has the architecture map, every design rule agreed so far, the tuning tables and the open items. Claude Code reads it automatically.

## Put it in front of beta testers

### Option 1: web link (fastest, works on any phone)

Deploy the folder to any static host:

- **Netlify:** drag the folder onto app.netlify.com/drop.
- **GitHub Pages:** push to a repo, then Settings → Pages → deploy from the main branch.
- **Vercel or Cloudflare Pages:** import the repo; no build command, output directory is the repo root.

Testers open the link and use **Add to Home Screen** (Safari share menu on iPhone, browser menu on Android). It then launches full-screen like an app and works offline. Bump `APP_VERSION` in `src/version.js` with each release so installed copies update.

### Option 2: native app builds

Wrap the same files with [Capacitor](https://capacitorjs.com) when you want store-style distribution:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Deepcore Blocks" com.yourname.deepcore --web-dir .
npx cap add ios && npx cap add android
npx cap open ios        # build in Xcode, upload to TestFlight
npx cap open android    # build in Android Studio, upload to Play internal testing
```

TestFlight needs an Apple Developer Program membership, and Play internal testing needs a Google Play Console account; check both sites for current fees and review rules. (Point `--web-dir` at a folder that contains only the web files once you add a build step.)

## Notes

- Progress is saved in the browser (`localStorage`), per device.
- The world map resets at midnight Pacific time for everyone.
- Analytics are off until you paste a PostHog project key into `src/config.js`.
- All art is original procedural pixel art drawn in code. Keep the name, art and any store listing original too.
