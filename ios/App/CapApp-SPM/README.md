# The Ultimate Break-up Guide — Project Notes

## What this app is

A mobile app (iOS + Android) for **mindsetsuccess.com**, built as a self-help/guide product around breakup recovery. Users can browse and read guide/book content, with paid content unlocked via purchase.

- **Web app:** Built in **Next.js**, hosted at `https://breakup-app-kappa.vercel.app`
- **Android:** Already approved and live on Google Play (no issues there)
- **iOS:** Originally wrapped using **Median.co** (a no-code WebView wrapper). Currently mid-migration to **Capacitor** (open-source, self-owned native project) — see "Why we moved off Median" below.

## Goals

1. Get the iOS app approved and live on the App Store.
2. Do this with **zero recurring platform/tool spend** (no Median.co paid plan, no per-build CI fees beyond GitHub's free tier).
3. Eventually restore in-app purchasing for guide content, done in a way that satisfies Apple's App Review rules (real StoreKit-based IAP, not a workaround).
4. Maintain this without owning a Mac — all builds and App Store uploads happen through cloud CI.

## Current status / history (important context)

- iOS app was **rejected under Guideline 3.1.1** (Payments — In-App Purchase). The app had a "Continue to Secure Checkout" button that opened an external browser (Safari) to a website checkout page for paid book/guide content, without offering In-App Purchase.
- Apple explicitly confirmed (in the review thread, July 2026) that the 2026 external-purchase-link rule changes for the US storefront **do not** exempt apps like this from IAP — those changes only removed the *entitlement requirement* for app categories that already qualified for external purchasing (e.g. genuine "reader" apps accessing previously-purchased content). Apps that let users initiate a purchase from inside the app for content unlocked in the app still require IAP.
- Decision made: rather than pay for Median's IAP plugin (unconfirmed pricing tier, likely $399–$2,240/year) or strip all purchasing from the app (which conflicts with the product's core purpose — "find and buy a book"), the team is migrating off Median entirely to a **self-owned Capacitor project**, so real IAP can be added via a free/open-source plugin (e.g. RevenueCat) with no recurring wrapper fee.

**Do not** attempt any version of "show Apple a compliant build, then switch functionality back after approval." This is a bait-and-switch pattern Apple actively checks for (webview-based apps pulling remote content are especially easy for them to re-verify post-approval) and risks full developer account termination, not just app rejection.

## Why we moved off Median → to Capacitor

Median is a managed, closed-source WebView wrapper — you don't own the native project, and features like IAP are gated behind paid plan tiers. **Capacitor** (Ionic, MIT-licensed, free) wraps the same Next.js web build into a real native Xcode project that we fully own, with no subscription. This lets us:
- Add native plugins (e.g. IAP via RevenueCat's free tier) without a Median fee
- Control the build pipeline completely (see below)

Trade-off: this is real engineering overhead compared to Median's no-code approach — a real native project, CI/CD pipeline, and code-signing setup to maintain going forward.

## Why we build/deploy via GitHub Actions (no Mac owned)

Building and signing an iOS app normally requires a Mac with Xcode. Nobody on this team owns one. Instead:

- **GitHub Actions provides macOS runners** — real Apple hardware in GitHub's cloud (not an emulator, no Apple EULA issue). This is how every build happens.
- **Free tier:** 2,000 CI minutes/month for private repos, but macOS runners consume minutes at a **10x multiplier** (so effectively ~200 real macOS-minutes/month free). A build takes roughly 8–15 minutes, so this comfortably covers regular development/submission cycles without paying anything.
- **Code signing without a Mac:** handled via an **App Store Connect API key** (Issuer ID + Key ID + `.p8` private key file), which lets `xcodebuild` manage provisioning and signing automatically (`-allowProvisioningUpdates`) — no manual certificate handling on a physical machine required.

### The pipeline, end to end

1. Push code to the repo (`main`/`master` branch triggers the workflow, or run manually via `workflow_dispatch`)
2. GitHub Actions spins up a `macos-latest` runner
3. Installs Node deps, builds the Next.js app, runs `npx cap sync ios` to sync web output into the Capacitor iOS project
4. Installs CocoaPods dependencies
5. `xcodebuild archive` — builds a release archive, signed automatically using the App Store Connect API key
6. `xcodebuild -exportArchive` — exports a signed `.ipa`
7. `xcrun altool --upload-app` — uploads the `.ipa` directly to App Store Connect
8. Build appears in **App Store Connect → TestFlight** within ~5–15 minutes
9. From there, everything is done in the browser: attach the build to the app version, hit Submit for Review (no Mac needed for this step either)

### Required GitHub repo secrets (Settings → Secrets and variables → Actions)

| Secret | What it is |
|---|---|
| `APP_STORE_CONNECT_KEY_ID` | Key ID from the App Store Connect API key |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from the same key |
| `APP_STORE_CONNECT_API_KEY_BASE64` | The `.p8` file, base64-encoded, pasted as text |
| `TEAM_ID` | Apple Developer Team ID |

**Note:** these must live in whichever repo currently holds the actual app code and workflow file (repo history has moved around during setup — always double check secrets exist in the repo that's actually running the workflow before troubleshooting "why is this failing").

**Important distinction for whoever manages Apple Developer access:** the App Store Connect API key (above) is different from a "Sign In with Apple" key (used only for Apple ID login inside the app, unrelated to builds/uploads). Don't confuse the two when asking the account owner for credentials.

## Open items / next steps

- [ ] Finish Capacitor migration and confirm iOS build succeeds via the GitHub Actions pipeline end to end (build → sign → upload)
- [ ] Add real IAP (StoreKit-based, via a free-tier plugin like RevenueCat) so purchases happen natively in the app, satisfying Guideline 3.1.1
- [ ] Once IAP is live, resubmit to App Review referencing the change, and confirm no external checkout links remain in the iOS build
- [ ] Consider whether "Sign In with Apple" (already configured) should be wired into the login flow

## For any AI assistant or developer picking this up

- The core constraint driving every decision here is **$0 recurring cost + no Mac hardware available**. Any suggested solution should respect both.
- Do not suggest re-adding an external checkout link/button to the iOS build without real IAP behind it — that is the exact thing that got the app rejected.
- Do not suggest or implement any approach where the app behaves differently during Apple's review than it does afterward.