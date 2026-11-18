# Chrome Web Store privacy fields — Financial Clock 3.0.0

Updated: 17 November 2026. Copy only the text inside each code block into its matching field. Each value has been counted and is below the 1,000-character limit. These values describe the current local version 3.0.0; no Developer Dashboard changes are claimed.

## Single purpose description

Characters: 500/1000

```text
AryamerX Financial Clock has one purpose: to help users understand and plan their time around reference forex sessions in their chosen time zone. Session clocks, overlap timelines, countdowns, daylight-saving information, personal availability, saved plans, custom schedules, preparation notes and optional reminders support this purpose. The popup, full workspace and side panel use the same offline calculations. The extension does not provide live prices, trading signals or broker-account access.
```

## storage justification

Characters: 636/1000

```text
Required to save preferences and session-planning content in chrome.storage.local, including time zone, language, theme, selected sessions, availability, plans, custom schedules, checklist items, notes and reminder rules. Local operational records prevent duplicate reminders. Supported legacy preferences may be read once from Chrome Sync during migration; version 3 does not write new data to Sync. Settings and planning content are not sent to AryamerX or analytics services. Settings > Erase local data resets local personal content and retains migration/reset markers; it does not delete older Chrome Sync copies or exported files.
```

## alarms justification

Characters: 480/1000

```text
Required to schedule on-device reminders for selected session events, overlap windows and saved plans while the popup is closed. Alarms also refresh the toolbar status badge when enabled and support reminder snoozing. The background worker uses the same local time calculations and saved reminder preferences, including lead times, selected days and quiet hours. No server requests are made. Chrome closure, device sleep or operating-system settings may delay or prevent delivery.
```

## sidePanel justification

Characters: 483/1000

```text
Required to display the offline session-planning workspace in Chrome's side panel when the user chooses to open it. Users can keep reference session times, overlap windows, countdowns and personal plans visible beside their current webpage without repeatedly opening the popup or switching to the full workspace tab. The panel loads bundled extension pages and assets. It does not read or modify website content, access browsing history or send planning content to external services.
```

## notifications justification

Characters: 526/1000

```text
Optional permission requested when the user enables reminders. It displays local Chrome notifications for selected session starts, ends, overlap events and saved plans, with a snooze action. Notifications may contain session names, event times and user-entered plan titles visible to anyone who can see the screen. Users can disable reminders in the extension or revoke permission in Chrome. Clocks, timelines, planning and exports work without notification permission. No push service or external notification server is used.
```

## Separate policy URL

The justifications do not replace the Privacy Policy URL. Enter the actual publicly accessible extension policy URL after publication and verification, not a homepage or product-directory URL. The proposed `/extensions/privacy` route has not been established as live by this document. Remote code is not used in this build; the matching dashboard selection is "No, I am not using remote code."

