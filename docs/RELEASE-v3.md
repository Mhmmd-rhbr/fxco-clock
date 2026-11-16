# AryamerX Financial Clock 3.0.0 — release preparation

Date: 16 November 2026  
Status: version 3.0.0 upload archive prepared; no store upload or publication recorded

## Product scope

Version 3 focuses on awareness and personal planning around reference market sessions. The approved scope is features 1–13 in [the strategy](research/financial-clock-v3-strategy-fa.md): session and overlap timelines, next-event countdown, weekly availability planning, date-aware simulation, daylight-saving changes, configurable reminders, a persistent side panel, toolbar status, custom schedules, calendar/text export, weekly-close and rollover context, pair-session presets, and session preparation routines.

The economic-calendar/data-feed feature is outside this release. The runtime is intended to work without network requests, API keys, analytics, accounts, subscriptions, or external JavaScript. General session conventions are bundled reference material rather than live broker availability or a liquidity measurement.

The toolbar popup is a compact 420-pixel-wide quick view without workspace navigation or editing forms. Its primary action opens `dashboard.html`, where the full session-planning workspace and settings are available. The side panel remains available as a persistent workspace alongside a website. The English and Persian popup previews both fit a 420 × 600 viewport without horizontal scrolling; the full Persian dashboard was also checked at 1280 × 900.

## Existing listing and version continuity

The existing public listing is [AryamerX Financial Clock](https://chromewebstore.google.com/detail/aryamerx-financial-clock/kfckocecbefclalkmjdkkpaoehicbede), extension ID `kfckocecbefclalkmjdkkpaoehicbede`.

Submit an update to that existing Developer Dashboard item to preserve its listing identity. An unpacked development installation can have a different extension ID. Before uploading, compare the highest version already present in the Developer Dashboard with `3.0.0`; the new version must be higher. A public listing alone does not establish the latest unpublished dashboard version.

No signing key, publishing credential, or store submission is part of the runtime package.

## Data and permissions

Version 3 uses local profile storage for settings and user-created planning content. Supported legacy preferences may be read once from Chrome Sync during migration. Version 3 must not write user data back to Sync. Older synchronized copies can remain in Chrome and should be described honestly.

Expected required permissions: `storage`, `alarms`, and `sidePanel`. Desktop `notifications` should be optional and requested only when the user enables reminders. This release does not need host permissions, content scripts, browsing-history access, cookies, or access to a trading account.

[PRIVACY.md](../PRIVACY.md) is the source policy text. Before store submission, publish the same policy at a stable HTTPS address on AryamerX and enter that URL in the Developer Dashboard. Do not invent a published policy URL or claim this step has been completed without checking it.

## Validation record

The final automated suite passes 30 of 30 tests. The evidence below distinguishes code and browser-page checks from installed-extension and operating-system checks.

| Area | Required evidence | Current result |
|---|---|---|
| Time engine | DST transitions, local/date conversion, weekend boundaries, cross-midnight sessions, overlap intersections, next events, and custom schedules | Passed: 19 engine tests, including US/Europe mismatch, half-hour transitions, 23/25-hour days, continuous schedules and overnight pauses |
| Reminders | Optional-permission behavior, duplicate prevention, quiet hours, restart/wake handling, and settings changes | Passed in Chrome API mock: delivery/dedupe, permission denial, snooze, quiet hours and disabling; regression checks cover a 10-day saved plan with badge off and no sessions, and an erase during a paused worker refresh. Actual Chrome/OS delivery remains untested |
| Local data | Legacy migration, validation, persistence, delete/reset behavior, and no Sync writes | Passed: 8 storage/worker tests, bounded validation, one-time migration, removed-only legacy center fallback, reset and pair consistency |
| Interface | Popup and side panel, light/dark/auto, English/Persian, RTL/LTR, keyboard focus, clear simulation state, and narrow layouts | Local webpage preview checked dark/light, English/Persian, RTL, compact popup and desktop dashboard, cross-midnight plan creation and preservation of unfinished form input across refresh. Side panel uses the same responsive dashboard; real side-panel API and exhaustive accessibility/auto-theme testing are not claimed |
| Network boundary | Final manifest plus runtime scan for remote assets, `fetch`, XHR, WebSocket, injected remote code, and hidden external requests | Passed static review: local assets/imports, no runtime network API or remote executable code, no host permissions/content scripts; CSP includes connect-src 'none'. External source/brand links require a click |
| Exports | `.ics` timestamps and escaping, readable multi-zone copy, local user-triggered download | Passed: 3 calendar tests including UTC, escaping and UTF-8 folding. Browser preview downloaded a cross-midnight plan with correct UTC instants, and copying returned success |
| Package | Runtime allowlist, valid manifest references, actual icon dimensions, clean ZIP contents, and archive size | Passed: 13 allowlisted files, manifest at root, referenced files present, original PNG validated; 657,942 compressed bytes |
| Browser | Load unpacked in Chrome; exercise permissions, side panel, toolbar, persistence, and notifications in a real extension context | Not performed in this session. UI evidence is from local webpage previews, not an installed extension. The user explicitly scheduled real desktop notification testing after publication |

Browser automation, if used, should operate only through the approved computer-use surface. A normal webpage preview or a stubbed API test is useful UI evidence but does not verify Chrome's real extension APIs.

Saved preview images are in `/Users/mamad/.codex/visualizations/2026/11/16/01a1e3ad-a1f2-7193-aae1-c875d076e28b/`: `financial-clock-v3-popup.jpg`, `financial-clock-v3-popup-fa.jpg`, and `financial-clock-v3-workspace-fa.jpg`. They show the actual local interface with the original logo. They are review previews, not a claim that store image-size requirements have been satisfied. A further browser recheck after the voice-session handoff was unavailable; the earlier saved preview evidence remains the basis of this record.

## Package and upload preparation

Run `node scripts/package.mjs` from the repository to create `dist/aryamerx-financial-clock-3.0.0.zip`. The script includes only explicitly allowlisted runtime files, checks actual PNG dimensions and manifest references, and compares the final archive entries with that allowlist. It uses Node's standard library and the system `zip`/`unzip` utilities; no npm dependencies are required.

Development tests, reports, source-control metadata, screenshots, `.DS_Store`, and unrelated design images remain outside the upload archive. `dist/` is a local build output and should not be committed.

The user supplied the original logo at `/Users/mamad/AryamerX/logo/logoamx.png` (2500 × 2500 pixels; 633,250 bytes). The runtime uses a byte-for-byte copy at `assets/logoamx.png` for the interface and all declared Chrome icon sizes, with no image editing or duplicated resized assets. Direct byte comparison passed; both files have SHA-256 `18e32b07d2f0708a34199701b5828539d7ec82bfd90a095affdd95159f7e5450`. The previous `icons/` artwork remains unmodified in the working tree and is excluded from the upload archive. The package script validates each declared icon size against its referenced PNG, reports oversized originals as notices, and rejects missing files, invalid PNG headers, or images smaller than a declared icon size.

Final archive: `dist/aryamerx-financial-clock-3.0.0.zip`  
Compressed size: **657,942 bytes** (about 643 KiB)  
Uncompressed runtime size: **775,028 bytes**  
SHA-256: `a4fc9d786a695c92869f2061380bf5ed6b98745a08222ed6acdc729857e6773e`

Checks run: `npm test` (30/30), `node --check` for runtime modules, `git diff --check`, runtime network/remote-code scan, original-logo comparison, and `npm run package` with manifest/import/PNG/ZIP allowlist validation. The archive includes the final reminder-horizon and erase-concurrency fixes.

Store approval, a live listing update, installed-extension behavior and notification delivery on another device remain separate from local verification. Upload copy and the Persian handoff are available in [STORE-LISTING-v3.md](STORE-LISTING-v3.md) and [UPLOAD-v3-fa.md](UPLOAD-v3-fa.md). Publishing the matching public privacy-policy page is still an external handoff step.

## Release notes draft

AryamerX Financial Clock 3.0 adds a compact toolbar quick view and a redesigned full session-planning workspace, with the original AryamerX logo, date-aware reference sessions, overlap timelines, personal availability, optional local reminders, side-panel access, custom schedules, calendar export, and session preparation routines. The core experience works offline and saves your planning data locally, with no account or paid data service required.

Store screenshots and descriptions should show actual behavior and clearly identify reference schedules and simulation mode. The copy above reflects the implemented scope; actual notification display is deferred as recorded above.
