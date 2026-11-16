# ممیزی فنی کد Financial Clock برای نسخه ۳

تاریخ بررسی: ۲۰۲۶-۱۱-۱۶  
نسخه هدف: `3.0.0`  
نسخه در manifest محلی بررسی‌شده: `1.0`  
وضعیت انتخاب قابلیت‌ها: در انتظار انتخاب کاربر؛ این سند مجوز شروع پیاده‌سازی قابلیت‌ها نیست.

این ممیزی بر فایل‌های موجود در `/Users/mamad/AryamerX/extension/fxco-clock2` انجام شده است. فقط یک سند تحقیقاتی اضافه شده؛ کد محصول، manifest و آیکون‌ها تغییر نکرده‌اند. پوشه `icons/` از ابتدای بررسی untracked بود و دست‌نخورده باقی مانده است. هیچ commit یا انتشار انجام نشده است.

در بررسی جداگانه صفحه عمومی فروشگاه توسط عامل اصلی، نسخه `2.0.0` نمایش داده شده است. بسته منتشرشده دریافت یا ممیزی نشده؛ بنابراین یافته‌های این سند فقط به کد محلی `1.0` مربوط‌اند و نباید به نسخه فعلی Chrome Web Store تعمیم داده شوند. پیش از ارتقا باید منبع نسخه منتشرشده، شناسه اکستنشن و زنجیره انتشار مشخص شود.

## جمع‌بندی فنی

زیرساخت موجود کوچک و قابل بازسازی است: Manifest V3، service worker و فایل‌های مستقل HTML/CSS/JavaScript، بدون dependency یا مرحله build. مشکل اصلی پیش از طراحی جدید، اعتبار محاسبه زمان است. جدول بازار، نمودارها، شبیه‌سازی و اعلان‌ها موتور مشترکی ندارند؛ timezone بازار، تعطیلات و تغییر ساعت فصلی در محاسبات اصلی لحاظ نمی‌شوند.

پیشنهاد اجرایی، ابتدا ساخت یک موتور مشترک و قابل آزمون برای زمان و بازه‌های بازار، سپس اتصال ظاهر جدید و قابلیت‌های منتخب به آن است. بازطراحی بصری باید همراه اصلاح صحت اطلاعات انجام شود.

## امکانات موجود و حدود آن‌ها

| قابلیت | وضعیت در کد محلی |
| --- | --- |
| پنجره اصلی | سه تب Markets، Settings و Visualizer با عرض ثابت ۶۰۰ پیکسل |
| ساعت | هر ثانیه تازه می‌شود؛ نمایش timezone انتخابی با قالب ثابت انگلیسی |
| مراکز مالی | ۱۲ نام در popup؛ هشت مورد پیش‌فرض و هشت مورد در background |
| انتخاب و جست‌وجوی بازار | پیاده‌سازی شده |
| قالب ساعات بازار | ۱۲ و ۲۴ ساعته؛ گزینه Custom عملکرد مستقل ندارد |
| تم | روشن و تاریک؛ Auto ایراد دارد |
| تنظیمات | ذخیره در `chrome.storage.sync`؛ validation و migration ندارد |
| شبیه‌سازی | ورودی تاریخ و ساعت؛ timezone ورودی روشن نیست |
| timeline و overlap | پیاده‌سازی اولیه با داده ثابت؛ محاسبات قابل اتکای تقویمی ندارند |
| اعلان | دو مسیر popup و worker؛ زمان‌بندی و جلوگیری از تکرار نیازمند اصلاح است |
| دسترسی به سایت‌ها یا قیمت زنده | در کد بررسی‌شده وجود ندارد |

## یافته‌های صحت زمان و بازار

اولویت «زیاد» یعنی باید پیش از انتشار نسخه جدید اصلاح شود. اولویت «متوسط» یعنی رفتار ناقص یا ابهام مهم برای استفاده روزمره وجود دارد. این اولویت‌ها ارزیابی فنی این مخزن هستند، نه نتیجه اجرای نسخه فروشگاه.

| اولویت | یافته و اثر | شاهد |
| --- | --- | --- |
| زیاد | timezone بازار وارد محاسبه نمی‌شود. `timezone` و `mode` در امضای تابع دریافت ولی مصرف نمی‌شوند؛ `timezoneName` بازار هم مصرف نمی‌شود. `setHours` از منطقه زمانی دستگاه استفاده می‌کند. | [تعریف بازارها](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:2)، [تابع وضعیت](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:558) |
| زیاد | هیچ کنترل آخر هفته، تعطیلی رسمی، نیم‌روز معاملاتی یا وقفه میان روز وجود ندارد. وضعیت صرفاً از ساعت روز به دست می‌آید. | [محاسبه isOpen](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:563) |
| زیاد | برای بازه عبوری از نیمه‌شب، بخش پس از نیمه‌شب اشتباه بسته محاسبه می‌شود؛ تابع فقط بازشدن امروز را می‌سازد و بازشدن روز قبل را بررسی نمی‌کند. | [ساخت بازه](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:564) |
| زیاد | وضعیت جدول با گذشت زمان تازه نمی‌شود. interval یک‌ثانیه‌ای فقط ساعت و interval دقیقه‌ای فقط Visualizer را اجرا می‌کند. | [راه‌اندازی UI](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:38) |
| زیاد | نام Forex با حالت بورس سهام مخلوط شده است. کنترل Stock Exchanges / 8 AM to 5 PM وجود دارد، ولی انتخاب آن در محاسبه تغییری ایجاد نمی‌کند. | [کنترل حالت](/Users/mamad/AryamerX/extension/fxco-clock2/popup.html:108)، [پارامتر mode بی‌استفاده](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:558) |
| زیاد | timeline زمان ثابت را مستقیم رسم می‌کند. نشانگر ساعت از timezone دستگاه می‌آید، اما برچسب timezone انتخابی را می‌گیرد. | [رسم timeline](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:420) |
| زیاد | overlap دقیقه‌ها را نادیده می‌گیرد؛ بازشدن ۰۲:۳۰ را از ابتدای ساعت ۰۲ حساب می‌کند و بخش ۰۰:۰۰ تا ۰۰:۳۰ یک بازه شبانه را از دست می‌دهد. تاریخ و تقویم هم وارد آن نمی‌شود. | [محاسبه overlap](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:499) |
| زیاد | گزینه `Europe/Frankfurt` یک شناسه IANA معتبر نیست و می‌تواند ساعت نمایشی را با `RangeError` متوقف کند. داده بازار همان فایل از `Europe/Berlin` استفاده می‌کند. | [گزینه نامعتبر](/Users/mamad/AryamerX/extension/fxco-clock2/popup.html:77)، [داده Frankfurt](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:8) |
| متوسط | تاریخ پیش‌فرض شبیه‌سازی از UTC و ساعت از زمان محلی گرفته می‌شود. ورودی نیز به‌صورت زمان محلی دستگاه parse می‌شود؛ تغییر timezone نمایش، معنای ورودی را تغییر نمی‌دهد. | [مقداردهی ورودی](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:141)، [parse ورودی](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:323) |

ساعات ثابت فعلی ممکن است از تبدیل ساعات بورس‌ها به یک timezone مبنا آمده باشند، اما منبع، تاریخ اعتبار و منطقه مبنای این مقادیر در مخزن مستند نشده است. این برداشت نباید به‌عنوان تأیید درست بودن ساعات استفاده شود.

## اعلان‌ها و چرخه عمر Manifest V3

| اولویت | یافته و اثر | شاهد |
| --- | --- | --- |
| زیاد | popup با interval دقیقه‌ای و Web Notifications اعلان می‌دهد؛ background با alarm پنج‌دقیقه‌ای و `chrome.notifications`. منطق مشترک و شناسه رویداد پایدار وجود ندارد. دو مسیر می‌توانند یک رویداد را جداگانه اعلام کنند. | [مسیر popup](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:600)، [alarm](/Users/mamad/AryamerX/extension/fxco-clock2/background.js:64) |
| زیاد | شرط اختلاف کمتر از سه دقیقه اجازه می‌دهد پیام «اکنون باز شد» دو دقیقه پیش از رویداد ارسال شود. بازگشت از sleep یا تأخیر alarm بازیابی مشخصی ندارد. | [شرط زمان اعلان](/Users/mamad/AryamerX/extension/fxco-clock2/background.js:115) |
| متوسط | background فقط هشت بازار را می‌شناسد؛ Chicago، Toronto، Singapore و Sydney Futures انتخاب‌پذیرند اما اعلان background ندارند. | [داده popup](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:2)، [داده worker](/Users/mamad/AryamerX/extension/fxco-clock2/background.js:90) |
| متوسط | درخواست permission در نصب به فعال بودن اعلان وابسته نیست. استفاده از `Notification.requestPermission()` در worker باید با API مناسب Chrome جایگزین و در اجرای واقعی بررسی شود. | [درخواست permission](/Users/mamad/AryamerX/extension/fxco-clock2/background.js:38) |

پیشنهاد: زمان‌بندی در worker بر اساس timestamp رویداد، ثبت شناسه آخرین رویداد ارسال‌شده، بازسازی alarmها هنگام startup و تغییر تنظیمات، سیاست روشن برای رویداد ازدست‌رفته، ساعات سکوت و فعال‌سازی اختیاری اعلان با درخواست کاربر. interval پنجره فقط برای تازه‌سازی نمایش مناسب است؛ مسئولیت اعلان نباید به باز ماندن popup وابسته باشد.

## تنظیمات، رابط و نگهداری

- **قالب ساعت بی‌اثر است:** مقدار `clockFormat` ذخیره می‌شود، اما [updateClock](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:338) همیشه options ثابتی برای `toLocaleString` دارد. «Custom» نیز در [formatTime](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:590) به همان خروجی ۲۴ساعته می‌رسد.
- **Auto theme ایراد دارد:** [applySettings](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:93) هر مقدار غیر از light را dark می‌کند. بررسی ترجیح سیستم در initializeUI پیش از رسیدن تنظیمات async انجام می‌شود و listener تغییر ترجیح سیستم وجود ندارد.
- **تنظیمات validate نمی‌شوند:** [loadSettings](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:63) shallow merge می‌کند. timezone نامعتبر، آرایه خراب یا مقادیر ناسازگار می‌توانند نمایش را مختل کنند. [saveSettings](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:75) نیز خطای ذخیره را بررسی نمی‌کند.
- **defaultها mutable و تکراری‌اند:** shallow copy آرایه‌ها و اشیای nested را share می‌کند؛ تغییر با push یا تغییر notifications ممکن است default در حافظه popup را هم عوض کند. تنظیمات پیش‌فرض جداگانه در worker هم خطر drift دارد.
- **تنظیمات جداگانه کامل نیست:** `settings.html` صفر بایت است. [settings.js](/Users/mamad/AryamerX/extension/fxco-clock2/settings.js:8) به marketData ذخیره‌نشده، listenerهای نیمه‌تمام و پیام‌های بدون handler متکی است. این مسیر در manifest به‌عنوان options page ثبت نشده؛ مسیر فعال همان تب تنظیمات popup است.
- **شبیه‌سازی علامت روشن ندارد:** کلاس `simulated-time` در [popup.js](/Users/mamad/AryamerX/extension/fxco-clock2/popup.js:359) افزوده می‌شود اما CSS ندارد. نسخه بعدی باید تاریخ، timezone و وضعیت شبیه‌سازی را واضح و قابل خروج نشان دهد.
- **رنگ نمودار overlap وصل نشده است:** متغیرهای رنگ در [styles.css](/Users/mamad/AryamerX/extension/fxco-clock2/styles.css:35) تعریف شده‌اند، اما کلاس‌های تولیدشده `.overlap-high`، `.overlap-medium` و `.overlap-low` قاعده مصرف‌کننده ندارند. [overlap-bar](/Users/mamad/AryamerX/extension/fxco-clock2/styles.css:504) هم background ندارد.
- **timeline به اصلاح هندسه نیاز دارد:** بازه شبانه split نمی‌شود؛ نوار می‌تواند از انتهای روز بیرون برود. نشانگر «اکنون» و نوارها نیز نسبت به ظرف‌هایی با عرض متفاوت محاسبه می‌شوند.

## دسترس‌پذیری و هویت بصری

ظاهر موجود از فونت سیستم، خاکستری/آبی عمومی و عرض ثابت استفاده می‌کند؛ [styles.css](/Users/mamad/AryamerX/extension/fxco-clock2/styles.css:5) و [اندازه popup](/Users/mamad/AryamerX/extension/fxco-clock2/styles.css:76) شاهد آن هستند. تطبیق دقیق با AryamerX باید بر مبنای بررسی سایت مادر در سند استراتژی انجام شود.

دکمه‌ها native هستند، اما [تب‌ها](/Users/mamad/AryamerX/extension/fxco-clock2/popup.html:13) معنای `tablist/tab/tabpanel`، وضعیت `aria-selected` و پیمایش کلید جهت ندارند. [جست‌وجو](/Users/mamad/AryamerX/extension/fxco-clock2/popup.html:24) و [ورودی‌های شبیه‌سازی](/Users/mamad/AryamerX/extension/fxco-clock2/popup.html:42) label متصل ندارند. label منطقه زمانی و قالب ساعت هم `for` ندارند. نمودار توضیح متنی معادل ندارد، reduced-motion تعریف نشده و زبان فعلی فقط انگلیسی است.

در طراحی نسخه ۳ باید وضعیت‌ها علاوه بر رنگ متن یا آیکون معنادار داشته باشند؛ keyboard focus، zoom، کنتراست، نمودار قابل خواندن و در صورت انتخاب چندزبانه، RTL واقعی بررسی شوند.

## مجوزها، داده و امنیت

[Manifest فعلی](/Users/mamad/AryamerX/extension/fxco-clock2/manifest.json:1) از MV3 و فقط `storage`، `alarms` و `notifications` استفاده می‌کند. در کد فعال، host permission، content script، fetch، WebSocket، analytics یا کد راه‌دور مشاهده نشد. بنابراین برای محاسبات زمان فعلی نیازی به خواندن صفحات مرورگر وجود ندارد.

تنظیمات در `chrome.storage.sync` ذخیره می‌شوند؛ در نتیجه ادعای «همه داده‌ها همیشه فقط روی دستگاه می‌مانند» برای وضع موجود دقیق نیست. پیشنهاد محصول رایگان، ذخیره محلی پیش‌فرض و sync اختیاری با توضیح روشن است. privacy policy در مخزن مشاهده نشد؛ وجود یا نبود آن در سایت و فروشگاه باید جداگانه تأیید شود.

`innerHTML` در ساخت جدول و نمودار استفاده شده است. نام‌های مسیر فعال با داده ثابت gate می‌شوند و exploit واقعی XSS در این ممیزی اثبات نشده است. با اضافه شدن import، عنوان سفارشی یا داده بیرونی، validation و ساخت DOM امن باید پیش از نمایش اضافه شوند.

## بازتولید محدود یافته‌ها

تابع `getMarketStatus` و helper مربوط به قالب از متن فعلی `popup.js` در یک VM در Node اجرا شدند؛ هیچ فایل تست یا کد محصولی تغییر نکرد. خروجی نمونه:

```text
market = { open: '18:00', close: '00:30', timezoneName: 'America/New_York' }

Monday 2026-11-16 00:15 local => isOpen: false
Sunday 2026-11-15 19:00 local => isOpen: true

timezone Asia/Tehran       => open: 18:00, close: 00:30
timezone America/New_York  => open: 18:00, close: 00:30
mode exchanges            => open: 18:00, close: 00:30
mode standard             => open: 18:00, close: 00:30

Intl.DateTimeFormat(..., { timeZone: 'Europe/Frankfurt' })
=> RangeError: Invalid time zone specified: Europe/Frankfurt
```

روز و ساعت نمونه‌های بالا به‌صورت تاریخ محلی دستگاه parse شدند؛ هدف اثبات رفتار فعلی تابع است، نه تعیین ساعت واقعی هیچ بازار. نصب در Chrome، اجرای service worker واقعی، بررسی مجوزها در مرورگر، رفتار دستگاه پس از sleep و تست نسخه production انجام نشده است.

## معماری پیشنهادی پیش از قابلیت‌های منتخب

1. **مدل داده مشترک:** نوع Forex session از exchange venue جدا باشد؛ timezone رسمی IANA، ساعات محلی، روزهای فعال، وقفه، استثنای تقویم، منبع و تاریخ اعتبار هر تعریف ثبت شوند. هیچ ساعت ثابت تبدیل‌شده به timezone کاربر در منبع اصلی ذخیره نشود.
2. **موتور زمان خالص:** ورودی timestamp، تاریخ مقصد و zone باشد؛ خروجی بازه‌های واقعی start/end، وضعیت فعلی، رویداد بعدی و دلیل تعطیلی. جدول، timeline، overlap، شبیه‌سازی و اعلان همگی این خروجی را مصرف کنند.
3. **تنظیمات versioned:** schema مشخص، validation، deep defaults و migration از تنظیمات کاربران موجود؛ یک منبع واحد برای defaultها و داده بازار.
4. **جداسازی مسئولیت:** worker مسئول scheduler و اعلان؛ popup مسئول نمایش سریع؛ Side Panel یا صفحه کامل فقط در صورت انتخاب قابلیت مرتبط. مجوزها متناسب با نیاز واقعی و قابلیت اختیاری درخواست شوند.
5. **پایداری داده:** کار آفلاین برای محاسبات پایه؛ نمایش صریح «برنامه معمول» وقتی تعطیلی یا داده استثنا تأیید نشده؛ source و آخرین به‌روزرسانی برای داده تقویمی.
6. **انتشار قابل بازگشت:** ابتدا پیدا کردن منبع بسته `2.0.0` فروشگاه و تطبیق آن با مخزن، سپس بسته نسخه `3.0.0` با همان شناسه و مسیر انتشار. شماره نسخه فعلاً تغییر نکرده است.

## آزمون‌های ضروری و معنی‌دار برای مرحله پیاده‌سازی

| آزمون | نتیجه‌ای که باید سنجیده شود |
| --- | --- |
| DST آمریکا و اروپا | در هفته‌های جابه‌جایی نامتقارن، ساعت و overlap صحیح تغییر کنند |
| عبور از نیمه‌شب | ابتدای روز به بازه آغازشده روز قبل تعلق بگیرد و نمودار split شود |
| آخر هفته و بازگشایی هفته | وضعیت session و بورس بر اساس مدل خودشان محاسبه شود |
| تعطیلی، نیم‌روز و break | تعطیلی کامل، early close و بازه بسته میان روز در تمام نماها یکسان باشند |
| timezoneهای نیم‌ساعته | Tehran و Kolkata بدون فرض offset ساعتی کامل کار کنند |
| شبیه‌سازی | ورودی با timezone مشخص به همان instant مورد انتظار برسد؛ خروج از حالت واضح باشد |
| سازگاری نماها | جدول، timeline، overlap و رویداد بعدی از یک بازه مشترک نتیجه بگیرند |
| scheduler واقعی Chrome | اعلان پس از بسته شدن popup، restart worker و sleep/wake مطابق سیاست تعریف‌شده و بدون تکرار باشد |
| migration | تنظیمات معتبر کاربر حفظ و داده خراب بدون crash بازیابی شود |
| دسترس‌پذیری | پیمایش با صفحه‌کلید، focus، نام کنترل‌ها، zoom و حالت کاهش حرکت بررسی شود |

این‌ها برنامه آزمون مرحله بعد هستند؛ به‌جز probe محدود تابع بالا، در این مرحله اجرا نشده‌اند. کد پیاده‌سازی، تغییر نسخه، commit و بسته انتشار تا انتخاب قابلیت‌ها و مشخص شدن منبع نسخه فروشگاه انجام نشده است.
