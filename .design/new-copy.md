# New copy for the redesign

The reference design carries two sections the app does not have yet — a
**Features** grid and an **About** band — plus an animated **counter strip**
above the hero headline. The app is trilingual, so each needs uz/en/ru.

These strings were written for this task, matched to the register the existing
`copy` object already uses: quiet, precise, no exclamation, no urgency. Add them
as new keys on all three language objects in `client/src/pages/Home.tsx`.
`type Copy = (typeof copy)[Language]` derives from `copy.uz`, so **every key must
exist in all three** or TypeScript will fail.

---

## Counter strip

| key | uz | en | ru |
|---|---|---|---|
| `countedSoFar` | `hozirgacha sanalgan namozlar —` | `prayers counted so far —` | `молитв засчитано —` |

The cycling prayer names come from the existing `t.prayerNames`, not a new key.

## Features section

| key | uz | en | ru |
|---|---|---|---|
| `featuresLabel` | `Imkoniyatlar` | `Features` | `Возможности` |
| `featuresTitle` | `Davom etish uchun kerak bo‘lgan hammasi.` | `Everything you need to keep going.` | `Всё, что нужно, чтобы продолжать.` |

Six cards. Key them `feat1Title`/`feat1Body` … `feat6Title`/`feat6Body`.

**1 — the ledger**
- uz `Har bir namoz uchun bitta daftar` / `Ado etgan har bir namozdan keyin + ni bosing. Bomdod, Peshin, Asr, Shom va Xufton hisobi doim ko‘z oldingizda.`
- en `One ledger for every prayer` / `Press + after each prayer you make up. Running counts for Fajr, Dhuhr, Asr, Maghrib and Isha, always in view.`
- ru `Одна тетрадь на все молитвы` / `Нажимайте + после каждой восполненной молитвы. Счёт по фаджру, зухру, асру, магрибу и ише всегда перед глазами.`

**2 — prayer times**
- uz `Namoz vaqtlari — siz turgan joyda` / `Beshala namoz vaqtini qat‘iy soat emas, sizning koordinatalaringizdagi quyoshning haqiqiy holati belgilaydi.`
- en `Prayer times, where you are` / `The sun’s real position for your coordinates decides when each of the five prayers falls, not a fixed clock.`
- ru `Время молитв там, где вы` / `Время каждой из пяти молитв определяет реальное положение солнца для ваших координат, а не фиксированные часы.`

**3 — progress**
- uz `Bosim emas, rivoj` / `Birinchi yozuvdan bugungacha — shaxsiy qaydnoma. Ketma-ketlik ham, solishtiruv ham yo‘q; faqat ado etilgani.`
- en `Progress, not pressure` / `A private record from your first entry to today. No streaks, no comparisons — just what’s been made up.`
- ru `Прогресс, а не давление` / `Личная запись от первой отметки до сегодня. Без серий и без сравнений — только то, что восполнено.`

**4 — the plan**
- uz `Rejani bir marta belgilang` / `Tug‘ilgan sanangizni va muntazam namoz o‘qiy boshlagan kuningizni kiriting. Balog‘at va hayz kunlari bilan birga qazoyingiz o‘zi hisoblanadi.`
- en `Set your plan once` / `Enter your birth date and when you began praying regularly. Your backlog, including bulugh and menstruation days, is worked out for you.`
- ru `План задаётся один раз` / `Введите дату рождения и день, когда начали молиться регулярно. Долг, включая булуг и дни менструации, рассчитается сам.`

**5 — day and night**
- uz `Yorug‘lik ortidan` / `Sahifa siz turgan joydagi quyosh bilan kunduzdan kechaga o‘tadi — yoki o‘zingiz xohlaganingizcha.`
- en `Follows the light` / `The page shifts from day to night with the sun at your location, or however you’d rather set it yourself.`
- ru `Следует за светом` / `Страница переходит ото дня к ночи вместе с солнцем в вашем месте — или так, как вы зададите сами.`

**6 — languages** (this card takes the three flags, not a dot tile)
- uz `O‘zbekcha, inglizcha, ruscha` / `Butun interfeys — istalgan paytda almashtiriladi, siz namoz o‘qiydigan tilda.`
- en `Uzbek, English, Russian` / `The whole interface, switchable at any time, in the language you pray in.`
- ru `Узбекский, английский, русский` / `Весь интерфейс переключается в любой момент — на языке, на котором вы молитесь.`

## About band

| key | uz | en | ru |
|---|---|---|---|
| `aboutLabel` | `Haqida` | `About` | `О приложении` |
| `aboutTitle` | `Ikki sanadan hisoblanadi, qo‘lda yozilmaydi.` | `Worked out from two dates, not typed in by hand.` | `Рассчитывается из двух дат, а не вводится вручную.` |

`aboutBody`:

- **uz** — `QazoTrack qazoyingizni tug‘ilgan sanangiz va muntazam namoz o‘qiy boshlagan kuningizdan kelib chiqib hisoblaydi. Balog‘at — bulug‘ — eng erta alomat bo‘yicha olinadi: o‘g‘il bolalar uchun 12 va 15 qamariy yosh orasida, qizlar uchun 9 va 15 orasida; alomat bo‘lmasa, 15 qamariy yoshda. Ayollar uchun har oydagi o‘rtacha hayz kunlari hisobdan chiqariladi. Hammasi o‘z akkauntingizda qoladi.`
- **en** — `QazoTrack works out your backlog from your date of birth and the date you began praying regularly. Religious maturity, bulugh, is taken at the earliest sign — between 12 and 15 lunar years for boys, 9 and 15 for girls — or at 15 lunar years if no sign ever appeared. For women, an average number of menstruation days each month is excluded from the count. Everything stays in your own account.`
- **ru** — `QazoTrack рассчитывает ваш долг из даты рождения и дня, когда вы начали молиться регулярно. Религиозное совершеннолетие, булуг, берётся по самому раннему признаку — между 12 и 15 лунными годами для мальчиков и между 9 и 15 для девочек — либо в 15 лунных лет, если признака не было. Для женщин из счёта исключается среднее число дней менструации в месяц. Всё остаётся в вашем аккаунте.`

The numbers in the About copy are not decorative — they restate
`BULUGH_RANGE` and `BULUGH_FALLBACK_YEARS` from `client/src/lib/qaza.ts`. If
those constants ever change, this copy is wrong. Prefer interpolating them the
way `t.bulughAgeHelp` already does if it can be done without mangling the
three translations; otherwise leave the literals and accept the coupling.
