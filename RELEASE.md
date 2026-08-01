# Releasing the Android app

App ID: `com.shahzadrizvi.toolshare` (permanent — cannot change after first Play Store publish)

## One-time setup (already done on this machine)

A release keystore was generated at `~/keystores/toolshare/toolshare-release.jks`
(outside the repo, never committed). Its path and passwords are referenced from
`android/local.properties` (gitignored, per-machine):

```
RELEASE_STORE_FILE=C:/Users/shahz/keystores/toolshare/toolshare-release.jks
RELEASE_KEY_ALIAS=toolshare
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_PASSWORD=...
```

See `~/keystores/toolshare/README.txt` for backup instructions. **Losing this
keystore means you can never publish an update to the existing Play Store
listing again.** Back it up somewhere durable.

## Building a signed release bundle locally

Requires JDK 21 (installed via `winget install EclipseAdoptium.Temurin.21.JDK`;
JDK 17 remains installed separately and is unaffected).

```sh
npm run build                # next build --turbopack (static export to /out)
npx cap sync android         # copy web build into the Android project
cd android
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot" ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

This `.aab` is what you upload to the Play Console (Play Store requires the
App Bundle format, not a raw APK, for new listings).

## Before every release

Bump the version in `android/app/build.gradle`:

```gradle
versionCode 1      // increment by 1 every single release, no exceptions
versionName "1.0"  // human-readable, e.g. "1.1", "2.0"
```

## Debug builds (no signing needed)

`.github/workflows/build-apk.yml` already builds an unsigned debug APK on every
push to `main` — useful for sideloading during testing, not for the Play Store.
