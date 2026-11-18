# AryamerX Financial Clock 3.1.0

A free, offline Chrome extension for understanding reference forex sessions and planning personal time around them. It uses Manifest V3, plain JavaScript, native browser time-zone rules and local storage, with no runtime dependencies or online data feeds.

## Interface

- A compact 420-pixel toolbar popup shows the next event, local clock and selected sessions.
- **Open workspace** launches the full dashboard in a separate extension tab for planning and settings.
- The same responsive dashboard can be opened in Chrome's side panel alongside a website.
- English/Persian, RTL/LTR, dark/light/system themes and 12/24-hour clocks are included.
- The interface and extension icons use small PNG exports of the original AryamerX logo.

## Features

1. Date-aware regional session schedules and a 24/48-hour timeline.
2. Exact session overlaps and next-event countdowns.
3. Weekly availability matching and saved personal plans.
4. Date/time simulation with a clear return to the present.
5. Upcoming daylight-saving changes in session and display time zones.
6. Optional local reminders with lead time, weekdays, quiet hours and snoozing.
7. A persistent Chrome side panel.
8. Toolbar badge with active-session count or time to the next session.
9. Custom recurring schedules and a manual broker schedule with a daily break.
10. Local calendar-file export and multi-zone text copying.
11. Reference weekly opening/closing and configured rollover context.
12. Currency-pair session presets.
13. A preparation checklist and note stored on the device.

Reference schedules are planning conventions, not live broker status, prices, liquidity or an exchange-holiday calendar. Calculations depend on the device clock and Chrome's time-zone rules. No account, subscription, telemetry service or API key is used. External links open only when clicked.

## Install for development

1. Open `chrome://extensions/` in Chrome 116 or later.
2. Enable **Developer mode**, choose **Load unpacked**, and select this project directory.
3. Pin the extension and open its popup. Use **Open workspace** for the full interface.

Settings and planning data use `chrome.storage.local`. Supported old preferences can be read once from Chrome Sync during migration; version 3 does not write to Sync. **Settings → Erase local data** removes local personal content and retains a migration marker to prevent old settings from returning.

Notifications are disabled by default and require optional permission when enabled. Chrome closure, sleep and operating-system settings can prevent or delay delivery.

## Validate and package

```sh
npm test
npm run package
```

No dependency installation or bundler is required. Packaging uses Node.js 22.2+ and the system `zip`/`unzip` utilities. The upload archive is `dist/aryamerx-financial-clock-3.1.0.zip`, with the manifest at its root and only explicitly allowlisted runtime files. The package command validates each PNG's exact dimensions and compressed pixel data, then checks the ZIP's integrity.

## Release materials

- [Version 3.1.0 installation fix and upload notes](docs/RELEASE-v3.1.md)
- [Release and validation record](docs/RELEASE-v3.md)
- [Persian upload guide](docs/UPLOAD-v3-fa.md)
- [English/Persian store copy and permission justifications](docs/STORE-LISTING-v3.md)
- [Privacy policy](PRIVACY.md), also bundled as `privacy.html`
- [Research and feature strategy](docs/research/financial-clock-v3-strategy-fa.md)
- [Historical audit of the original local version](docs/research/financial-clock-v3-code-audit-fa.md)

The release record distinguishes automated tests and browser-page previews from installed-extension verification and store publication. Real desktop notification delivery is scheduled for post-publication testing at the user's request.

## Source layout

`lib/engine.js` owns time calculations; `lib/store.js` validates and migrates data; `lib/calendar.js` generates calendar exports; `background.js` handles alarms, badges and optional notifications; `popup.js` renders both popup and dashboard. Runtime HTML, styles and the logo are bundled locally. Tests and release documents stay outside the store archive.

MIT license; see [LICENSE](LICENSE).
