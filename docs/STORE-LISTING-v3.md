# Chrome Web Store copy — AryamerX Financial Clock 3.0.0

Prepared: 16 November 2026  
Status: copy prepared for review; no store upload, submission, approval, or publication is recorded here

Use the existing listing, extension ID `kfckocecbefclalkmjdkkpaoehicbede`. Reconcile the wording below with the final tested build and the current Developer Dashboard fields before submitting.

## Name

AryamerX Financial Clock — Session Planner

## Short description

Plan forex sessions, compare overlaps and set local reminders. Offline clocks, a weekly planner and calendar export.

The short description above is 116 characters, within the 132-character field limit.

## English description

Make time for the market sessions you follow.

AryamerX Financial Clock brings reference forex-session schedules, time-zone comparisons and personal planning into one offline workspace. Check the next session event in a compact toolbar popup, then open the full workspace or Chrome side panel when you want to plan ahead.

WHAT YOU CAN DO

- Follow regional reference sessions and compare their overlap windows on a 24- or 48-hour timeline.
- See a countdown to the next session opening, closing or selected overlap event.
- Match your weekly availability with the sessions you follow and save useful windows as plans.
- Explore a different date and time with a clearly marked simulation mode.
- Review upcoming daylight-saving changes and their effect on displayed session times.
- Choose optional desktop reminders, lead times, weekdays and quiet hours.
- Keep your workspace available in Chrome's side panel, without granting access to the current website's contents.
- Check a brief session-status badge on the extension's toolbar icon.
- Define personal schedules and a manual broker-clock profile, including a daily break.
- Export saved plans as calendar files or copy their times across time zones.
- View reference weekly closing and reopening times separately from your personal schedule.
- Use currency-pair presets to focus the session display.
- Keep a short preparation checklist and note for the session ahead.

FREE AND LOCAL

No account, subscription, API key or paid data service is required. The extension's core functions run locally and do not fetch live prices, news, economic calendars or remote code. Preferences and planning content are stored in your Chrome profile's local extension storage. There are no analytics or advertising services. External brand and source pages open only when you choose their links.

Older versions may have used Chrome Sync for preferences. Version 3 can read supported legacy preferences once for migration, then writes version 3 data locally. Previous copies retained by Chrome Sync are separate from the new local data.

LANGUAGE AND APPEARANCE

English and Persian interfaces, right-to-left layout, light/dark/system appearance, and 12- or 24-hour time formats are included.

ABOUT THE SCHEDULES

Session windows are bundled reference conventions for time planning. They are not a live broker-availability feed, an exchange-holiday calendar or a measurement of current liquidity. Currency presets are educational time filters and do not provide trading signals. Check your broker's published hours for the instruments you use.

Calculations depend on your device clock and Chrome's time-zone rules. Notifications require your permission; a sleeping device, a closed browser or operating-system settings can delay or prevent delivery.

Support: https://aryamerx.com/extensions

## توضیح کوتاه فارسی

سشن‌های فارکس را با ساعت محلی خود ببینید، هم‌پوشانی‌ها را مقایسه کنید و برای زمان‌های منتخب برنامه و یادآور بسازید. نمای سریع نوار ابزار، برنامه‌ریز هفتگی، شبیه‌سازی تاریخ، تغییر ساعت فصلی، پنل کناری، ساعت سفارشی بروکر، خروجی تقویم و چک‌لیست آمادگی در یک ابزار رایگان و آفلاین جمع شده‌اند.

رابط فارسی و انگلیسی، تم روشن/تیره/سیستم و قالب ۱۲/۲۴ ساعته در دسترس‌اند. حساب کاربری، اشتراک، API پولی، تبلیغات یا ارسال برنامه‌ها به سرور لازم نیست؛ اطلاعات نسخه ۳ در فضای محلی پروفایل Chrome ذخیره می‌شوند. اعلان دسکتاپ اختیاری است.

ساعت سشن‌ها مرجع برنامه‌ریزی است و وضعیت زنده بروکر، تعطیلات رسمی بورس یا نقدشوندگی فعلی را تضمین نمی‌کند. فیلتر جفت‌ارز آموزشی است و سیگنال معامله ارائه نمی‌دهد. محاسبات به ساعت دستگاه و قواعد زمانی مرورگر وابسته‌اند؛ بسته‌بودن مرورگر یا خواب دستگاه ممکن است اعلان را به تأخیر بیندازد.

## Single-purpose explanation for the dashboard

The extension helps users understand and plan their time around reference forex market sessions. Its clocks, overlap timeline, personal availability, plans, optional reminders, custom schedules, calendar export and preparation routine all serve that single time-awareness and session-planning purpose.

## Permission justifications for the dashboard

| Permission | Justification |
|---|---|
| `storage` | Saves user preferences and session-planning content in local extension storage, including time zone, availability, plans, custom schedules, checklists and reminder preferences. Supported older preferences may be read once from Chrome Sync during migration; version 3 does not write new data to Sync. |
| `alarms` | Schedules local reminder checks and toolbar-status updates while the popup is closed. Reminder delivery state is saved locally to avoid duplicate notifications and support user-requested snoozing. |
| `sidePanel` | Displays the same session-planning workspace in Chrome's persistent side panel. This feature does not read the current tab's page content. |
| Optional `notifications` | Requested when the user enables desktop reminders. Displays local reminders for selected session events and saved plans; permission is not required for clocks, timelines, planning or exports. |

No host permissions, content scripts, browsing-history access or broker-account access are required. The extension does not use remotely hosted executable code.

## Privacy policy and disclosure handoff

The website's existing privacy address is [aryamerx.com/privacy](https://aryamerx.com/privacy). That existing website address must not be presented as an updated extension-specific policy unless its published contents have actually been reconciled with this release.

Publish the final [extension policy](../PRIVACY.md) at an appropriate stable AryamerX HTTPS address or add matching extension-specific coverage to the existing page, then enter the verified final URL in the Developer Dashboard. This preparation task does not establish that the website policy has been updated or that its wording matches version 3.

The dashboard's data disclosures must describe actual local handling of preferences and user-created plans/notes, the one-time legacy migration, optional notifications and user-triggered exports. Do not infer that “no server collection” means local user content can be ignored in Google's disclosure questions. Recheck the current dashboard categories when completing the form. No advertising, sale, analytics transfer or unrelated use of this data is implemented.

## Store assets and publication record

Use screenshots from the final build: the compact popup, full overview, weekly planner, time tools and Persian interface. Do not depict live market data, signals, automatic broker connectivity or features outside this release.

Keep the existing original AryamerX logo. The runtime uses its original PNG without image modification. The local ZIP, automated tests and browser preview are separate evidence from store review. No wording in this document guarantees Google approval or claims that an update is already live.
