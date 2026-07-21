# Native Packaging Guide

This app is currently an HTML/React prototype that runs offline as a single HTML file. To publish to the Apple App Store and Google Play Store, wrap it as a native app. **Capacitor** is the easiest path — it embeds your existing HTML/CSS/JS inside a native iOS and Android shell with minimal changes.

This document is the checklist for getting from "prototype" to "submittable build".

---

## 1. Wrap in Capacitor

```bash
# from project root
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Gin Rummy" "com.yourdomain.ginrummy" --web-dir=.
npx cap add ios
npx cap add android
```

Open `capacitor.config.json` and set:

```json
{
  "appId": "com.yourdomain.ginrummy",
  "appName": "Gin Rummy",
  "webDir": ".",
  "backgroundColor": "#1a1612",
  "ios": {
    "scheme": "Gin Rummy",
    "contentInset": "always",
    "limitsNavigationsToAppBoundDomains": true,
    "preferredContentMode": "mobile"
  },
  "android": {
    "backgroundColor": "#1a1612",
    "allowMixedContent": false,
    "captureInput": true
  },
  "server": {
    "androidScheme": "https"
  }
}
```

---

## 2. Pre-compile the JSX

Babel-in-browser adds ~150 ms to launch and ships ~250 KB of unused code. Pre-compile once at build time:

```bash
npm install --save-dev @babel/cli @babel/preset-react @babel/preset-env
```

`.babelrc`:
```json
{ "presets": ["@babel/preset-env", "@babel/preset-react"] }
```

Compile all `.jsx` to `.js`:
```bash
npx babel "*.jsx" -d build/
```

Update the HTML to load the pre-compiled `.js` files (no `type="text/babel"`).

---

## 3. Bundle fonts locally

Currently `styles.css` pulls Cormorant Garamond and DM Sans from Google Fonts CDN. Inside a packaged app there's no guaranteed first-launch network. **Download the WOFF2 files and serve them locally:**

1. Get the .woff2 files from <https://gwfh.mranftl.com/fonts> for both families (subsets: latin + latin-ext + cyrillic for Russian support; the demo also uses Japanese & Chinese — use system-font fallback for those).
2. Drop them in `./fonts/`.
3. Replace the `@import` in `styles.css` with `@font-face` declarations:
   ```css
   @font-face {
     font-family: 'Cormorant Garamond';
     src: url('./fonts/cormorant-garamond-500.woff2') format('woff2');
     font-weight: 500; font-style: normal; font-display: swap;
   }
   /* … repeat for each weight + italic */
   ```
4. Verify the fallback chain still works if a font fails to decode.

For CJK languages (中文/日本語), bundling a CJK font would balloon the binary by 5–10 MB. The font stack falls back to `Hiragino Sans` / `PingFang SC` / `Noto Sans CJK` on each platform — fine for the small amount of UI text we have.

---

## 4. App icons + splash

You need both. Make a master 1024×1024 PNG of the icon, then generate the platform sizes via Capacitor:

```bash
npm install --save-dev @capacitor/assets
mkdir assets
# place a 1024×1024 icon.png and 2732×2732 splash.png in /assets/
npx capacitor-assets generate
```

The icon should look like a Gin Rummy app — felt green background with brass ♠ glyph would match the in-app aesthetic. The splash should be the felt color (`#1a1612`) with the same glyph centered, large but with ~30% padding.

---

## 5. Safe areas

Already wired in CSS via `env(safe-area-inset-*)` on the `.gr` root. Verify on a device with a notch (iPhone 15+, modern Android) that nothing is clipped at top/bottom.

If you find content clipped, the issue is likely that the root flex container needs `flex: 1; min-height: 0` instead of `height: 100%`.

---

## 6. Pull-to-refresh

Already suppressed via `overscroll-behavior: contain` on `html, body`. On Android Capacitor you may also need:

```json
// capacitor.config.json
"android": { "webContentsDebuggingEnabled": false, "captureInput": true }
```

---

## 7. Status bar

```bash
npm install @capacitor/status-bar
```

In your bootstrap script:
```js
import { StatusBar, Style } from '@capacitor/status-bar';
StatusBar.setStyle({ style: Style.Dark });    // light text on the felt
StatusBar.setBackgroundColor({ color: '#1a1612' });
```

For light theme: swap to `Style.Light` when `resolved === 'light'`.

---

## 8. Native haptics

`navigator.vibrate` does nothing on iOS Safari. Replace with the Capacitor plugin:

```bash
npm install @capacitor/haptics
```

Edit `ui.jsx` → `haptic()`:
```js
import { Haptics, ImpactStyle } from '@capacitor/haptics';
function haptic(ms = 8) {
  if (Capacitor.getPlatform() === 'web') {
    try { navigator.vibrate?.(ms); } catch {}
    return;
  }
  const style = ms < 6 ? ImpactStyle.Light : ms < 20 ? ImpactStyle.Medium : ImpactStyle.Heavy;
  Haptics.impact({ style }).catch(() => {});
}
```

---

## 9. Storage

The app uses `localStorage` keyed under `gr-counter.v2`. In Capacitor this is per-app and safe.

For very heavy users (200+ games), consider migrating to `@capacitor/preferences` or IndexedDB later. Not blocking for v1.

---

## 10. Privacy policy

Both stores require one even though we never send data anywhere. Minimal content:

> Gin Rummy Counter does not collect, transmit, or share any personal data. All games, players, scores, and settings are stored only on your device. You can delete everything at any time from Settings → Delete all data.
>
> Contact: your-email@example.com

Host this as a static page (a free GitHub Pages site is enough) and link it from the App Store / Play Store listing.

---

## 11. Store listings

You'll need, per language you support:
- **App name** (≤ 30 chars): "Gin Rummy" or "Gin Rummy · Counter"
- **Subtitle** (≤ 30 chars iOS): "Two-player score pad"
- **Description** (≤ 4000 chars): expand on the tagline
- **Keywords** (iOS, ≤ 100 chars): gin rummy, card game, score keeper, two player, counter
- **Screenshots**: at least 4 per device class
  - iPhone 6.7" (1290×2796): Home, Game, Score-hand, Stats, Winner
  - iPad 12.9" (2048×2732) if supporting iPad
  - Android phone (1080×1920+)
- **Feature graphic** (Android, 1024×500): the felt-and-brass aesthetic translates well

Translations: since the app ships in 9 languages, store listings in those languages will perform much better. Use the in-app i18n keys as the source.

---

## 12. Pre-launch checklist

- [ ] Icon set generated (Capacitor Assets)
- [ ] Splash screen renders without flash of unstyled content
- [ ] All fonts bundled locally
- [ ] Babel pre-compiled (no in-browser transform on launch)
- [ ] Native haptics swap in
- [ ] Status bar styled correctly in both themes
- [ ] Notch / home indicator respected on test devices
- [ ] Pull-to-refresh suppressed
- [ ] Privacy policy URL ready
- [ ] Delete all data action tested
- [ ] Backup export + import tested
- [ ] App version in `state.jsx` matches `Info.plist` / `build.gradle`
- [ ] Tested on smallest supported screen (iPhone SE — 375×667)
- [ ] Translations reviewed by native speakers for non-English locales
- [ ] App store screenshots + listing copy ready in each shipped language

Shipping a v1 with English + German + Russian only is reasonable; add the other languages once their translations are reviewed.

---

## 13. After shipping

- Crash reporting: `@capacitor/firebase-crashlytics` or Sentry
- Analytics (if desired): minimal, GDPR-friendly — Plausible or similar
- Future feature ideas: Hollywood (3 simultaneous games), Oklahoma (variable target), 3+ player support, online play (would need a backend)
