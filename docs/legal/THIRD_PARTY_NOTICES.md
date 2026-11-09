# Merzkava Pocket — Third-party licences and credits

This inventory accompanies the Pocket APK. It is a notice and attribution record, not a licence grant for Merzkava Pocket's own source code or original project assets.

## 1. Bundled vinyl surface-noise asset

- **“Warm organic vinyl record crackle #6” — Sdanezis, Pixabay.**
- Pixabay identifies the source as AI-generated and 11 seconds long.
- The MP3 source was converted to OGG for Pocket's smaller package size.
- Used as a low-level, continuous loop only while background music is playing. It is embedded in the application experience and is not exposed as a standalone audio download.
- **Pixabay Content License:** free use and adaptation, including commercial use, without mandatory attribution; standalone redistribution of the content in substantially the same form is prohibited. Credit is voluntarily shown in Settings.
- Source: https://pixabay.com/vi/sound-effects/phim-hi%25E1%25BB%2587u-%25E1%25BB%25A9ng-%C4%2591%25E1%25BA%25B7c-bi%25E1%25BB%2587t-warm-organic-vinyl-record-crackle-6-586283/
- Licence summary: https://pixabay.com/service/license-summary/
- Full terms: https://pixabay.com/service/terms/
- Asset source record: [assets/sfx/vinyl-player/SOURCES.md](../../assets/sfx/vinyl-player/SOURCES.md)

## 2. Declared direct JavaScript packages

The app's `review-apk/package.json` declares:

| Package | Pinned version | Declared licence |
|---|---:|---|
| animejs | 4.5.0 | MIT |
| phaser | 4.2.1 | MIT |
| takumi-js | 2.19.0 | MIT OR Apache-2.0 |
| vite | 6.4.1 | MIT |

The APK build scans the installed `node_modules` tree and copies package metadata plus the available full `LICENSE`, `LICENCE`, `COPYING`, and `NOTICE` texts into the in-app `THIRD_PARTY_NOTICES.txt`. This includes transitive and build-time npm packages as well as the direct packages above. Packages whose metadata or licence text is missing are explicitly flagged rather than silently assigned a licence.

Upstream licence references:
- animejs: https://www.npmjs.com/package/animejs
- Phaser: https://phaser.io/download/license
- takumi-js: https://www.npmjs.com/package/takumi-js
- Vite: https://github.com/vitejs/vite/blob/main/packages/vite/LICENSE.md

## 3. Android build toolchain (build-time; not bundled as Pocket app code)

- Gradle 8.9 — Apache License 2.0.
- Android Gradle Plugin 8.7.3 — Apache License 2.0.
- Eclipse Temurin JDK 17 — GPLv2 with the Classpath Exception for the OpenJDK runtime distribution; its distribution may include additional components under their own terms.
- Android SDK platform/build tools — governed by the licences displayed for the specific SDK packages installed by the build workflow. These tools are not copied into the APK.

These are build tools and are listed for transparency; the generated in-app npm notice file covers packages installed by npm.

## 4. Existing assets whose provenance is not yet documented

The following files were already present in the repository, but the repository did not contain their original source or licence records during this audit:

- `Happy-1a.ogg`
- `chill-1a.ogg`
- `needle drop+vinyls crackle.mp3`
- `record placement.mp3`

Their licence status is **not verified by this notice**. They are deliberately marked as pending provenance rather than being incorrectly attributed to Pixabay or an open-source package. Add creator/source URLs and the applicable licence before redistributing these assets outside the existing project context.

## 5. Merzkava Pocket project code and original assets

The repository has no root `LICENSE` file. This notice does not assign an open-source licence to Merzkava Pocket's own code, UI, game rules, or original project assets, and does not change their ownership. Third-party notices apply only to components identified here and in the generated in-app notice.

## 6. Keeping the inventory current

When a dependency, bundled media asset, font, icon, or external artwork changes:
1. Keep its package/version or exact asset filename in the inventory.
2. Record its creator/source page and applicable licence.
3. Rebuild the APK so npm licence texts are regenerated from the installed dependency tree.
4. Check the generated `THIRD_PARTY_NOTICES.txt` for packages flagged with unknown licence metadata or missing licence text.
