import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Eye, EyeOff, Minus, Moon, Plus, RotateCcw, Settings2, Sun } from "lucide-react";
import { calculateQaza, DEFAULT_MENSTRUATION_DAYS, validateProfile, type Profile, type ValidationCode } from "@/lib/qaza";
import { ApiError, getState, logIn, logOut, me, putState, signUp, type ApiErrorCode, type User } from "@/lib/api";
import { FALLBACK_COORDINATES, currentPrayer, type Coordinates } from "@/lib/solar";
/**
 * Three.js is around 130 kB gzipped — more than the rest of the app put
 * together, for something decorative in the hero. Loading it separately keeps
 * the first paint at the weight it was before the orrery existed; the scene
 * appears a moment later over the wash that is already there.
 */
const SolarScene = lazy(() => import("@/components/SolarScene"));
import CountUp from "@/components/CountUp";

type Language = "uz" | "en" | "ru";
type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type Counts = Record<PrayerKey, number>;
/**
 * Day -> prayer -> how many were made up that day. Aggregated rather than one
 * row per prayer: the backlog runs to five figures, and a per-entry log would
 * grow to hundreds of kilobytes in localStorage for no extra insight.
 */
type History = Record<string, Partial<Record<PrayerKey, number>>>;

const languages: { key: Language; flag: string; label: string }[] = [
  { key: "uz", flag: "🇺🇿", label: "O‘zbekcha" },
  { key: "en", flag: "🇬🇧", label: "English" },
  { key: "ru", flag: "🇷🇺", label: "Русский" },
];
const emptyCounts: Counts = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
/** Only a starting point for the setup form — the reader's own numbers replace these. */
const defaultTargets: Counts = { fajr: 12, dhuhr: 18, asr: 16, maghrib: 11, isha: 21 };
const prayerMeta = [
  { key: "fajr", arabic: "الفجر", target: 12 },
  { key: "dhuhr", arabic: "الظهر", target: 18 },
  { key: "asr", arabic: "العصر", target: 16 },
  { key: "maghrib", arabic: "المغرب", target: 11 },
  { key: "isha", arabic: "العشاء", target: 21 },
] as const;
/**
 * A calendar day in the reader's own timezone.
 *
 * NOT `toISOString().slice(0, 10)`, which is UTC: east of Greenwich that
 * attributes anything logged between local midnight and UTC midnight to the
 * previous day. For UTC+5 that window is 00:00-05:00 local — precisely when
 * Fajr is prayed, so the prayer most likely to be logged early was the one
 * most likely to land on the wrong day.
 */
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;


const copy = {
  uz: {
    accountLabel: "Akkaunt", quickAdd: "Namoz qo‘shish", quickAddTitle: "Qaysi namoz?", quickAddNote: "Ado etgan bo‘lsangiz + ni bosing. Qazo bo‘lsa — chapdagi tugmani.", quickAddClose: "Yopish", howLabel: "Yo‘riqnoma", howTitle: "QazoTrack qanday ishlaydi", howClose: "Yopish", howStep1: "Akkaunt yarating", howStep1Body: "Yozuvlaringiz akkauntingizda saqlanadi, shuning uchun telefonda ham, kompyuterda ham bir xil ko‘rinadi.", howStep2: "Rejangizni hisoblang", howStep2Body: "Tug‘ilgan sanangizni va namozni muntazam o‘qiy boshlagan sanangizni kiriting. Qancha namoz qazo bo‘lgani shundan hisoblanadi.", howStep3: "Har kuni belgilab boring", howStep3Body: "Ado etgan har bir namozdan keyin + tugmasini bosing. Qazo qolgan namozni esa ro‘yxatga qo‘shib qo‘yasiz.", howStep4: "Rivojni kuzating", howStep4Body: "Vaqt bo‘yicha egri chiziq birinchi kundan bugungacha qancha namoz ado etganingizni ko‘rsatadi.", addMissed: "Qazo qo‘shish", addMissedTitle: "Bugun qazo bo‘lgan namozlar", addMissedBody: "Bugun o‘qilmay qolgan namozni ro‘yxatga qo‘shing — u rejangizga qo‘shiladi.", addMissedOne: "Bitta qazo qo‘shildi.", addMissedDone: "Qo‘shildi", noDataYet: "—", firstRunHint: "Raqamlar akkaunt yaratganingizdan keyin paydo bo‘ladi.", signUpTitle: "Akkaunt yarating", logInTitle: "Akkauntingizga kiring", accountBody: "Akkaunt yozuvlaringizni telefon va kompyuterda bir xil saqlab turadi.", email: "Elektron pochta", password: "Parol", passwordHint: "Kamida 8 belgi.", showPassword: "Parolni ko‘rsatish", hidePassword: "Parolni yashirish", signUp: "Akkaunt yaratish", logIn: "Kirish", signOut: "Chiqish", haveAccount: "Akkauntingiz bormi? Kirish", noAccount: "Akkauntingiz yo‘qmi? Yaratish", authWorking: "Bir lahza…", loadingAccount: "Yozuvlaringiz yuklanyapti…", importedLocal: "Shu qurilmadagi yozuvlar hisobingizga ko‘chirildi.", syncFailed: "Saqlanmadi. Aloqa tiklangach, qayta uriniladi.", errors: { emailInvalid: "Pochta manzili noto‘g‘ri kiritilgan.", passwordShort: "Parol kamida 8 ta belgidan iborat bo‘lsin.", emailTaken: "Bu pochta orqali akkaunt allaqachon yaratilgan.", credentialsWrong: "Pochta yoki parol mos kelmadi.", rateLimited: "Urinishlar soni ko‘payib ketdi. 15 daqiqadan keyin qayta urinib ko‘ring.", unauthorized: "Seans muddati tugadi. Akkauntingizga qayta kiring.", badRequest: "So‘rovni bajarib bo‘lmadi.", offline: "Server bilan aloqa o‘rnatilmadi." }, 
    overTime: "Vaqt bo‘yicha", overTimeNote: "Jami qazo qilingan namozlar — birinchi yozuvdan bugungacha.", overTimeEmpty: "Egri chiziq ikkinchi kundan boshlab chiziladi.", since: "boshlanishi", total: "jami", 
    stats: "Statistika", statsTitle: "Rivojingiz bir qarashda.", statsNote: "Faqat qayd: solishtiruv ham, ketma-ketlik ham yo‘q.", byPrayer: "Namozlar bo‘yicha", last30: "So‘nggi 30 kun", pace: "Sur‘at", perDay: "Kuniga o‘rtacha", projected: "Taxminiy tugash", atThisPace: "Shu sur‘atda", noActivity: "Hali yozuv yo‘q — birinchi namozdan keyin shu yerda ko‘rinadi.", noProjection: "Sur‘at aniqlangach ko‘rsatiladi.", done: "Bajarildi", 
    today: "Bugun", overview: "Umumiy", adjust: "Rejani sozlash", heroTitle: <>Qazo namozlaringizni<br /><em>birin-ketin</em> ado eting.</>, heroBody: "Qazo namozlaringizni ko‘z oldingizda saqlaydigan, ularni boshqarishga va izchil ado etishga yordam beradigan sodda vosita.", countPrayer: "Namoz sanash", howItWorks: "Qanday ishlaydi", intro: "Ketma-ketlik ham, bosim ham yo‘q. Faqat ado etgan namozlaringizning aniq qaydi — bosqichma-bosqich.", openLedger: "Bugungi daftarni ochish", adjustPlan: "Rejamni sozlash", trust: "Izchil rivoj uchun soddalashtirilgan.", ledger: "Bugungi daftar", ledgerTitle: "Oz bo‘lsa ham, ado etilgani ado etilgan.", ledgerNote: <>Har bir ado etilgan namozdan keyin + ni bosing.<br />Keyin istalgan payt o‘zgartirishingiz mumkin.</>, countedToday: "bugun ado etilgan namoz", remaining: "rejada qolgan namoz", monthTarget: "oylik maqsaddan", planned: "rejalashtirilgan", reset: "Bugunni tozalash", ready: "Boshlashga tayyor.", complete: "Bir namoz ado etilgan deb belgilandi.", movedBack: "Bir namoz ro‘yxatga qaytarildi.", cleared: "Bugungi yozuvlar o‘chirildi.", private: "Ma’lumotlaringiz akkauntingizda saqlanadi va boshqa hech kimga ko‘rinmaydi.", future: "Sozlamalaringiz kelajakdagi yangilanish uchun tayyor.", planReady: "Rejangizni istalgan payt o‘zgartirishingiz mumkin.", overviewLabel: "Reja ko‘rinishi", overviewTitle: "Oyingiz bir qarashda.", overviewNote: <>Keyingi e’tiboringiz qayerda bo‘lishi<br />mumkinligini sodda ko‘ring.</>, countedOf: "{n} ta rejalashtirilgan namozdan sanaldi", stillToGo: "hali qoldi", local: "mahalliy vaqt", setupLabel: "Sozlash", setupTitle: "Nechta namozni qazo qilyapsiz?", setupBody: "Tug‘ilgan sanangizni va namozni muntazam o‘qiy boshlagan sanangizni kiriting — qolganini tizim hisoblab beradi.", birthDate: "Tug‘ilgan sana", gender: "Jins", male: "Erkak", female: "Ayol", startPraying: "Namozni qachon boshlagansiz", notYet: "Hali muntazam emas", pickDate: "Sanani tanlang", menstruation: "Oyiga hayz kunlari", menstruationHelp: "O‘rtacha qiymat. Bu kunlar umumiy hisobdan chiqarib tashlanadi.", bulughNote: "Balog‘at yoshi: o‘g‘il bolalar uchun 12 qamariy yil, qiz bolalar uchun 9 qamariy yil — hanafiy manbalaridagi ehtiyotkor o‘lchov.", estimateLabel: "Hisob", bulughDate: "Balog‘at sanasi", daysCounted: "kun hisoblandi", excluded: "kun chiqarildi", perPrayer: "Har bir namozdan", errBirthMissing: "Tug‘ilgan sanani kiriting.", errBirthFuture: "Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.", errBirthRange: "Sana 1937–2076 oralig‘ida bo‘lishi kerak.", errStartBefore: "Bu sana balog‘at sanasidan oldin.", errStartFuture: "Bu sana kelajakda.", setupSave: "Kuzatishni boshlash", setupCancel: "Bekor qilish", setupSaved: "Rejangiz saqlandi.", now: "Hozir", prayerNames: { fajr: "Bomdod", dhuhr: "Peshin", asr: "Asr", maghrib: "Shom", isha: "Xufton" }, firstLight: "Tong oldi", midday: "Peshin", lateAfternoon: "Kechki tush", afterSunset: "Quyosh botgach", night: "Tun", sunSettling: "Kun sokinlashmoqda.", steady: "Shoshilmasdan, barqaror.", prayerTime: "{name} vaqti", personal: "Shaxsiy foydalanish", footer: "Barqaror rivoj uchun yaratilgan", remove: "Bir namozni olib tashlash", add: "Bir namoz qo‘shish", targetOf: "maqsadning",
  },
  en: {
    accountLabel: "Account", quickAdd: "Add a prayer", quickAddTitle: "Which prayer?", quickAddNote: "Press + if you made it up. Press the dashed button if you missed it.", quickAddClose: "Close", howLabel: "How it works", howTitle: "How QazoTrack works", howClose: "Close", howStep1: "Create an account", howStep1Body: "Your record lives in your account, so it reads the same on your phone and your laptop.", howStep2: "Work out your plan", howStep2Body: "Enter your date of birth and when you began praying regularly. The number of missed prayers is calculated from those two dates.", howStep3: "Mark them off daily", howStep3Body: "Press + after each prayer you make up. If you miss one today, add it to the list instead.", howStep4: "Watch it move", howStep4Body: "The curve over time shows how many you have made up, from your first entry to today.", addMissed: "Add missed", addMissedTitle: "Missed today", addMissedBody: "Add a prayer you missed today and it joins your plan.", addMissedOne: "One missed prayer added.", addMissedDone: "Added", noDataYet: "—", firstRunHint: "Your figures appear once you have an account.", signUpTitle: "Create your account", logInTitle: "Sign in", accountBody: "An account keeps your record with you across phone and laptop.", email: "Email", password: "Password", passwordHint: "At least 8 characters.", showPassword: "Show password", hidePassword: "Hide password", signUp: "Create account", logIn: "Sign in", signOut: "Sign out", haveAccount: "Already have an account? Sign in", noAccount: "No account yet? Create one", authWorking: "One moment…", loadingAccount: "Loading your record…", importedLocal: "The record already on this device has been moved into your account.", syncFailed: "Not saved — this will retry once the connection is back.", errors: { emailInvalid: "That email address does not look right.", passwordShort: "Use at least 8 characters.", emailTaken: "There is already an account with that email.", credentialsWrong: "That email and password do not match.", rateLimited: "Too many attempts. Try again in 15 minutes.", unauthorized: "Your session has ended. Please sign in again.", badRequest: "That request could not be completed.", offline: "Could not reach the server." }, 
    overTime: "Over time", overTimeNote: "Total prayers made up, from your first entry to today.", overTimeEmpty: "The curve appears once there is a second day to draw between.", since: "from", total: "total", 
    stats: "Stats", statsTitle: "Your progress at a glance.", statsNote: "A record only — no comparisons and no streaks.", byPrayer: "By prayer", last30: "Last 30 days", pace: "Pace", perDay: "Average per day", projected: "Projected finish", atThisPace: "At this pace", noActivity: "Nothing recorded yet — your first prayer will show up here.", noProjection: "Shown once there is a pace to measure.", done: "Done", 
    today: "Today", overview: "Overview", adjust: "Adjust plan", heroTitle: <>Complete your missed prayers<br /><em>one calm step</em> at a time.</>, heroBody: "A simple place to keep your missed prayers visible, manageable, and moving in the right direction.", countPrayer: "Count a prayer", howItWorks: "How it works", intro: "No streaks. No pressure. Just a clear record of the prayers you’ve made space for, one quiet entry at a time.", openLedger: "Open today’s ledger", adjustPlan: "Adjust my plan", trust: "Kept simple for steady progress.", ledger: "Today’s ledger", ledgerTitle: "A little done is still done.", ledgerNote: <>Tap + after each prayer you make up.<br />You can always adjust it later.</>, countedToday: "prayers counted today", remaining: "remaining in this plan", monthTarget: "of this month’s target", planned: "planned", reset: "Reset today", ready: "Ready when you are.", complete: "One prayer marked complete.", movedBack: "One prayer moved back to your list.", cleared: "Today’s entries have been cleared.", private: "Your progress is stored privately in your account.", future: "Your settings are ready for a future update.", planReady: "Your plan can be adjusted whenever you need.", overviewLabel: "Plan overview", overviewTitle: "Your month at a glance.", overviewNote: <>A simple view of where your attention<br />can go next.</>, countedOf: "of {n} planned prayers counted", stillToGo: "still to go", local: "local time", setupLabel: "Set up", setupTitle: "How many prayers are you making up?", setupBody: "Enter your date of birth and when you began praying regularly — the rest is worked out for you.", birthDate: "Date of birth", gender: "Gender", male: "Male", female: "Female", startPraying: "When you began praying regularly", notYet: "Not regularly yet", pickDate: "Pick a date", menstruation: "Menstruation days per month", menstruationHelp: "On average. These days are excluded from the count.", bulughNote: "Maturity is taken as 12 lunar years for boys and 9 for girls — the cautious figure used in Hanafi guidance.", estimateLabel: "Estimate", bulughDate: "Maturity date", daysCounted: "days counted", excluded: "days excluded", perPrayer: "Of each prayer", errBirthMissing: "Enter your date of birth.", errBirthFuture: "That date is in the future.", errBirthRange: "The date needs to fall between 1937 and 2076.", errStartBefore: "That is before your maturity date.", errStartFuture: "That date is in the future.", setupSave: "Start tracking", setupCancel: "Cancel", setupSaved: "Your plan has been saved.", now: "Now", prayerNames: { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" }, firstLight: "First light", midday: "Midday", lateAfternoon: "Late afternoon", afterSunset: "After sunset", night: "Night", sunSettling: "The day is settling.", steady: "Steady, not hurried.", prayerTime: "{name} time", personal: "Personal use", footer: "Built for steady progress", remove: "Remove one prayer", add: "Add one prayer", targetOf: "of this month’s target",
  },
  ru: {
    accountLabel: "Аккаунт", quickAdd: "Добавить молитву", quickAddTitle: "Какая молитва?", quickAddNote: "Нажмите + если восполнили. Пунктирную — если пропустили.", quickAddClose: "Закрыть", howLabel: "Как это работает", howTitle: "Как работает QazoTrack", howClose: "Закрыть", howStep1: "Создайте аккаунт", howStep1Body: "Записи хранятся в вашем аккаунте, поэтому они одинаковы на телефоне и на компьютере.", howStep2: "Рассчитайте план", howStep2Body: "Укажите дату рождения и когда вы начали регулярно молиться. Количество пропущенных молитв считается по этим двум датам.", howStep3: "Отмечайте каждый день", howStep3Body: "Нажимайте + после каждой восполненной молитвы. А пропущенную сегодня — добавьте в список.", howStep4: "Следите за прогрессом", howStep4Body: "График по времени показывает, сколько молитв восполнено с первой записи до сегодня.", addMissed: "Добавить пропуск", addMissedTitle: "Пропущено сегодня", addMissedBody: "Добавьте молитву, пропущенную сегодня, — она войдёт в ваш план.", addMissedOne: "Одна пропущенная молитва добавлена.", addMissedDone: "Добавлено", noDataYet: "—", firstRunHint: "Цифры появятся после создания аккаунта.", signUpTitle: "Создайте аккаунт", logInTitle: "Войти", accountBody: "Аккаунт сохраняет ваши записи на телефоне и компьютере.", email: "Эл. почта", password: "Пароль", passwordHint: "Не менее 8 символов.", showPassword: "Показать пароль", hidePassword: "Скрыть пароль", signUp: "Создать аккаунт", logIn: "Войти", signOut: "Выйти", haveAccount: "Уже есть аккаунт? Войти", noAccount: "Нет аккаунта? Создать", authWorking: "Минуточку…", loadingAccount: "Загружаем ваши записи…", importedLocal: "Записи с этого устройства перенесены в ваш аккаунт.", syncFailed: "Не сохранено — повторим после восстановления связи.", errors: { emailInvalid: "Адрес почты выглядит неверно.", passwordShort: "Используйте не менее 8 символов.", emailTaken: "Аккаунт с такой почтой уже есть.", credentialsWrong: "Почта и пароль не совпадают.", rateLimited: "Слишком много попыток. Повторите через 15 минут.", unauthorized: "Сеанс завершён. Войдите снова.", badRequest: "Запрос не выполнен.", offline: "Не удалось связаться с сервером." }, 
    overTime: "Со временем", overTimeNote: "Всего восполнено — от первой записи до сегодня.", overTimeEmpty: "Кривая появится со второго дня.", since: "с", total: "всего", 
    stats: "Статистика", statsTitle: "Ваш прогресс одним взглядом.", statsNote: "Только запись — без сравнений и без серий.", byPrayer: "По молитвам", last30: "Последние 30 дней", pace: "Темп", perDay: "В среднем в день", projected: "Ожидаемое завершение", atThisPace: "При таком темпе", noActivity: "Пока нет записей — первая молитва появится здесь.", noProjection: "Появится, когда будет что измерять.", done: "Готово", 
    today: "Сегодня", overview: "Обзор", adjust: "Изменить план", heroTitle: <>Восполняйте пропущенные молитвы<br /><em>шаг за спокойным</em> шагом.</>, heroBody: "Простое место, где пропущенные молитвы остаются видимыми, управляемыми и движутся в правильном направлении.", countPrayer: "Считать молитву", howItWorks: "Как это работает", intro: "Без серий и давления. Только ясная запись молитв, которым вы нашли место, — один спокойный шаг за раз.", openLedger: "Открыть дневник", adjustPlan: "Изменить мой план", trust: "Просто для устойчивого прогресса.", ledger: "Дневник сегодня", ledgerTitle: "Даже малое дело — дело.", ledgerNote: <>Нажимайте + после каждой восполненной молитвы.<br />Позже всё можно изменить.</>, countedToday: "молитв сегодня", remaining: "осталось в плане", monthTarget: "от цели месяца", planned: "запланировано", reset: "Сбросить сегодня", ready: "Готово, когда готовы вы.", complete: "Одна молитва отмечена.", movedBack: "Одна молитва возвращена в список.", cleared: "Записи за сегодня очищены.", private: "Ваш прогресс хранится конфиденциально в вашем аккаунте.", future: "Настройки будут доступны в будущем обновлении.", planReady: "План можно изменить в любое время.", overviewLabel: "Обзор плана", overviewTitle: "Ваш месяц одним взглядом.", overviewNote: <>Простой взгляд на то, куда<br />направить внимание дальше.</>, countedOf: "из {n} запланированных молитв отмечено", stillToGo: "осталось", local: "местное время", setupLabel: "Настройка", setupTitle: "Сколько молитв вы восполняете?", setupBody: "Укажите дату рождения и когда вы начали регулярно молиться — остальное мы посчитаем.", birthDate: "Дата рождения", gender: "Пол", male: "Мужской", female: "Женский", startPraying: "Когда начали регулярно молиться", notYet: "Пока не регулярно", pickDate: "Выберите дату", menstruation: "Дней менструации в месяц", menstruationHelp: "В среднем. Эти дни исключаются из подсчёта.", bulughNote: "Совершеннолетие берётся как 12 лунных лет для мальчиков и 9 для девочек — осторожная оценка из ханафитских источников.", estimateLabel: "Расчёт", bulughDate: "Дата совершеннолетия", daysCounted: "дней учтено", excluded: "дней исключено", perPrayer: "Каждой молитвы", errBirthMissing: "Укажите дату рождения.", errBirthFuture: "Эта дата в будущем.", errBirthRange: "Дата должна быть между 1937 и 2076.", errStartBefore: "Это раньше даты совершеннолетия.", errStartFuture: "Эта дата в будущем.", setupSave: "Начать отслеживание", setupCancel: "Отмена", setupSaved: "Ваш план сохранён.", now: "Сейчас", prayerNames: { fajr: "Фаджр", dhuhr: "Зухр", asr: "Аср", maghrib: "Магриб", isha: "Иша" }, firstLight: "Перед рассветом", midday: "Полдень", lateAfternoon: "После полудня", afterSunset: "После заката", night: "Ночь", sunSettling: "День успокаивается.", steady: "Спокойно и без спешки.", prayerTime: "Время {name}", personal: "Для личного использования", footer: "Создано для устойчивого прогресса", remove: "Убрать одну молитву", add: "Добавить одну молитву", targetOf: "от цели месяца",
  },
} as const;

type Copy = (typeof copy)[Language];

const localeFor = (language: Language) => (language === "uz" ? "uz-UZ" : language === "ru" ? "ru-RU" : "en-US");

/**
 * Which prayer it is, and how far through the day the sun has moved.
 *
 * This used to assume the sun rose at 05:00 and set at 21:00, with the five
 * prayers at fixed clock times, so the line under the hero was decoration. It
 * is now solved from the sun's real altitude for the reader's own coordinates.
 */
function getTimeState(date: Date, language: Language, coordinates: Coordinates) {
  const { current, isNight, progress, times } = currentPrayer(date, coordinates);
  const localized = copy[language];
  const labels: Record<PrayerKey, string> = { fajr: localized.firstLight, dhuhr: localized.midday, asr: localized.lateAfternoon, maghrib: localized.afterSunset, isha: localized.night };
  const clock = (at: Date | null) => (at ? at.toLocaleTimeString(localeFor(language), { hour: "numeric", minute: "2-digit" }) : null);
  return {
    isNight,
    progress,
    current,
    times,
    at: clock,
    label: labels[current],
    formatted: date.toLocaleTimeString(localeFor(language), { hour: "numeric", minute: "2-digit" }),
  };
}

export default function Home() {
  // The record now belongs to an account rather than to this browser, so it
  // starts empty and is filled in once the session is known.
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [targets, setTargets] = useState<Counts>(defaultTargets);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // Distinguishes "not signed in" from "not yet known", which decides whether
  // the sign-up panel or a loading line is shown.
  const [sessionChecked, setSessionChecked] = useState(false);
  const [recordLoaded, setRecordLoaded] = useState(false);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("qaza-language") as Language) || "en");
  const [activeView, setActiveView] = useState<"today" | "overview" | "stats">("today");
  const [history, setHistory] = useState<History>(() => { try { const saved = localStorage.getItem("qaza-history"); return saved ? JSON.parse(saved) : {}; } catch { return {}; } });
  const [notice, setNotice] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<PrayerKey | null>(null);
  const [themeOverride, setThemeOverride] = useState<"day" | "night" | null>(() => { const saved = localStorage.getItem("qaza-theme"); return saved === "day" || saved === "night" ? saved : null; });
  const [now, setNow] = useState(() => new Date());
  // Where the reader is, for the sun. Starts on the fallback so the scene has
  // something real to draw before the permission prompt is answered — or if it
  // never is, which is the common case.
  const [coordinates, setCoordinates] = useState<Coordinates>(() => {
    try {
      const saved = localStorage.getItem("qaza-coordinates");
      if (saved) return JSON.parse(saved) as Coordinates;
    } catch { /* fall through to the default */ }
    return FALLBACK_COORDINATES;
  });
  // Which face the account form shows. It lives here rather than inside Auth so
  // that the two header controls can each open the form on the right one.
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const t = copy[language];

  /** Opens the account form on the chosen face and brings it into view. */
  const goToAuth = (mode: "signup" | "login") => {
    setAuthMode(mode);
    document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Every action that needs the record goes through here.
   *
   * Signed out, the ledger and the setup form are not rendered at all, so these
   * buttons had nothing to scroll to and nothing to open — they looked broken
   * rather than gated. Sending the reader to the account form says what is
   * actually required. It also stops `showSetup` being left true while the
   * account form is up, which would drop the reader into setup on sign-in.
   */
  const requireAccount = (action: () => void) => {
    if (!user) { goToAuth("signup"); return; }
    action();
  };
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  /**
   * Asks for the reader's location once, and remembers the answer.
   *
   * Declining is not an error worth reporting: the fallback is a real place and
   * the sun is drawn correctly for it, so the page is never wrong — only
   * somewhere else. The coordinates never leave the device.
   */
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    if (localStorage.getItem("qaza-coordinates")) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoordinates(next);
        try { localStorage.setItem("qaza-coordinates", JSON.stringify(next)); } catch { /* private mode */ }
      },
      () => { /* declined or unavailable; the fallback stands */ },
      { maximumAge: 86400000, timeout: 10000 },
    );
  }, []);
  useEffect(() => { localStorage.setItem("qaza-language", language); }, [language]);
  // Resume an existing session on load. A 401 here is the ordinary case for a
  // first visit, not an error worth showing.
  useEffect(() => { me().then(({ user: found }) => setUser(found)).catch(() => undefined).finally(() => setSessionChecked(true)); }, []);

  // Pull this account's record, once per sign-in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRecordLoaded(false);
    getState().then(async (remote) => {
      if (cancelled) return;
      if (remote.profile) {
        setProfile(remote.profile);
        setTargets((remote.targets as Counts) ?? defaultTargets);
        setCounts((remote.counts as Counts) ?? emptyCounts);
        setHistory((remote.history as History) ?? {});
        setShowSetup(false);
      } else {
        // Nothing on the server yet. If this browser still holds a record from
        // before accounts existed, carry it up rather than silently leaving the
        // reader with an empty ledger and their old numbers stranded.
        const local = readLegacyRecord();
        if (local) {
          setProfile(local.profile);
          setTargets(local.targets);
          setCounts(local.counts);
          setHistory(local.history);
          setShowSetup(false);
          setNotice(t.importedLocal);
          await putState(local).catch(() => undefined);
          clearLegacyRecord();
        } else {
          setShowSetup(true);
        }
      }
      if (!cancelled) setRecordLoaded(true);
    }).catch(() => { if (!cancelled) setRecordLoaded(true); });
    return () => { cancelled = true; };
  }, [user]);

  // Persist changes. Held back until the record has loaded, otherwise the
  // empty defaults would race the fetch and overwrite the account.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!user || !recordLoaded || showSetup) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      putState({ profile, targets, counts, history }).catch(() => setNotice(t.syncFailed));
    }, 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [user, recordLoaded, showSetup, profile, targets, counts, history]);

  const signOutNow = async () => {
    await logOut().catch(() => undefined);
    // Drop everything in memory so the next person to sign in on this browser
    // cannot see the previous account's numbers.
    setUser(null); setRecordLoaded(false); setProfile(null); setCounts(emptyCounts);
    setTargets(defaultTargets); setHistory({}); setShowSetup(false); setActiveView("today"); setNotice(null);
  };

  const timeState = getTimeState(now, language, coordinates);
  // The clock decides unless the reader has explicitly chosen.
  const isNight = themeOverride ? themeOverride === "night" : timeState.isNight;
  const toggleTheme = () => { const next = isNight ? "day" : "night"; setThemeOverride(next); localStorage.setItem("qaza-theme", next); };
  const totals = useMemo(() => {
    const completed = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const target = Object.values(targets).reduce((sum, value) => sum + value, 0);
    // A reader who owes nothing divides by zero and renders "NaN%", and one who
    // counts past their plan goes over 100% with a negative remainder. Both are
    // reachable: the first by having begun praying at maturity, the second by
    // pressing + more times than the plan asks for.
    return {
      completed,
      target,
      remaining: Math.max(0, target - completed),
      percent: target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0,
    };
  }, [counts, targets]);
  const changeCount = (key: PrayerKey, delta: number) => {
    setCounts((current) => {
      const next = Math.max(0, current[key] + delta);
      // Only record a change that actually happened — pressing minus at zero
      // must not write a phantom entry into the history.
      if (next !== current[key]) {
        const day = localDay(new Date());
        setHistory((log) => {
          const forDay = { ...(log[day] ?? {}) };
          forDay[key] = Math.max(0, (forDay[key] ?? 0) + delta);
          if (forDay[key] === 0) delete forDay[key];
          const nextLog = { ...log, [day]: forDay };
          if (Object.keys(forDay).length === 0) delete nextLog[day];
          return nextLog;
        });
      }
      return { ...current, [key]: next };
    }); setPulseKey(key); window.setTimeout(() => setPulseKey((current) => current === key ? null : current), 280); setNotice(delta > 0 ? t.complete : t.movedBack); };
  // Both hero actions point at the ledger, which only exists in the Today
  // view — from Overview they were silent no-ops. Switch first, then scroll
  // once the row has actually been rendered.
  const openLedger = () => requireAccount(() => { setActiveView("today"); window.setTimeout(() => document.getElementById("prayer-ledger")?.scrollIntoView({ behavior: "smooth" }), 0); });
  const openSetup = () => requireAccount(() => setShowSetup(true));

  /**
   * Adds a prayer missed today to the backlog.
   *
   * The + in each row records one made up; this is the other direction, for a
   * prayer missed today that now has to be made up later. It raises the target
   * rather than the count, so what remains goes up by one and the percentage
   * falls — which is what actually happened.
   */
  const addMissed = (key: PrayerKey) => requireAccount(() => {
    setTargets((current) => ({ ...current, [key]: current[key] + 1 }));
    setNotice(t.addMissedOne);
    // No putState here. The debounced autosave already watches `targets`, so
    // writing directly would send the same record twice for one press — once
    // now and once 600ms later.
  });

  const resetToday = () => { setCounts(Object.fromEntries(Object.keys(emptyCounts).map((key) => [key, 0])) as Counts); setHistory({}); setNotice(t.cleared); };

  return <main className={`site-shell ${isNight ? "night" : "day"}`} id="top" lang={language}>
    <header className="site-header container"><a className="brand" href="#top" aria-label="QazoTrack home"><img className="brand-logo" src="/qazotrack-logo.png" alt="" aria-hidden="true" /><span className="brand-wordmark">QazoTrack</span></a><nav className="top-nav" aria-label="Primary navigation">{user && <><button className={activeView === "today" ? "chip active" : "chip"} onClick={() => setActiveView("today")}>{t.today}</button><button className={activeView === "overview" ? "chip active" : "chip"} onClick={() => setActiveView("overview")}>{t.overview}</button><button className={activeView === "stats" ? "chip active" : "chip"} onClick={() => setActiveView("stats")}>{t.stats}</button><button className="nav-cta" onClick={() => setShowSetup(true)}>{t.adjust} <ArrowRight size={14} /></button></>}<div className="language-switcher" role="group" aria-label="Language"><span className="language-current">{languages.find((item) => item.key === language)?.flag}</span>{languages.map((item) => <button key={item.key} className={language === item.key ? "language-button active" : "language-button"} onClick={() => setLanguage(item.key)} aria-label={item.label} title={item.label}>{item.flag}<span>{item.key.toUpperCase()}</span></button>)}</div>{user
      ? <div className="account-control"><span className="account-email" title={user.email}>{user.email}</span><button className="chip" onClick={signOutNow}>{t.signOut}</button></div>
      : <div className="account-control"><button className="chip" onClick={() => goToAuth("login")}>{t.logIn}</button><button className="nav-cta" onClick={() => goToAuth("signup")}>{t.signUp} <ArrowRight size={14} /></button></div>}<button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme" aria-pressed={isNight}>{isNight ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />}</button></nav></header>
    <section className="visual-stage"><div className="hero container"><div className="hero-copy"><h1 className="display">{t.heroTitle}</h1><p className="prose">{t.heroBody}</p><div className="hero-actions"><button className="btn btn-primary" onClick={openLedger}>{t.countPrayer} <ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{t.howItWorks} <ChevronRight size={15} /></button></div></div><div className="hero-visual-wrap"><div id="hero-visual" className="gradient-visual"><div className="day-arc" aria-hidden="true"><span className="sun-marker" style={{ "--sun-progress": timeState.progress } as React.CSSProperties} /></div><Suspense fallback={null}><SolarScene coordinates={coordinates} isNight={isNight} /></Suspense><div className="sun-status"><span className="sun-kicker">{t.now} · {timeState.formatted}</span><strong>{t.prayerTime.replace("{name}", t.prayerNames[timeState.current])}</strong><span>{timeState.at(timeState.times[timeState.current]) ?? timeState.label} · {t.local}</span></div><span className="gradient-caption">{isNight ? t.sunSettling : t.steady}</span></div><div className="stat-stack">{user ? <><div><span className="figure">{totals.completed}</span><span className="caption">{t.countedToday}</span></div><div><span className="figure">{totals.remaining}</span><span className="caption">{t.remaining}</span></div><div><span className="figure">{totals.percent}%</span><span className="caption">{t.monthTarget}</span></div></> : <div className="stat-empty"><span className="figure">{t.noDataYet}</span><span className="caption">{t.firstRunHint}</span></div>}</div></div></div><div className="intro-band"><div className="container intro-grid"><div><p className="intro-copy">{t.intro}</p><div className="hero-actions"><button className="btn btn-primary" onClick={openLedger}>{t.openLedger} <ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={openSetup}>{t.adjustPlan} <Settings2 size={15} /></button></div></div><p className="trust-line"><span className="trust-dot" />{t.trust}</p></div></div></section>
    {!sessionChecked ? <section className="ledger-band"><div className="container"><p className="caption">{t.loadingAccount}</p></div></section> :
    !user ? <Auth t={t} mode={authMode} onModeChange={setAuthMode} onAuthed={setUser} /> :
    !recordLoaded ? <section className="ledger-band"><div className="container"><p className="caption">{t.loadingAccount}</p></div></section> :
    showSetup ? <Setup profile={profile} t={t} firstRun={!profile} onCancel={() => setShowSetup(false)} onSave={(nextProfile, nextTargets) => { setProfile(nextProfile); setTargets(nextTargets); setShowSetup(false); setNotice(t.setupSaved); putState({ profile: nextProfile, targets: nextTargets, counts, history }).catch(() => setNotice(t.syncFailed)); }} /> :
    <section className="ledger-band"><div className="container">{activeView === "today" ? <><div className="section-intro"><div><p className="label">{t.ledger}</p><h2 className="h2">{t.ledgerTitle}</h2></div><p className="caption section-note">{t.ledgerNote}</p></div><div id="prayer-ledger" className="summary-rail"><div className="summary-main"><span className="figure">{totals.completed}</span><span className="caption">{t.countedToday}</span></div><div className="summary-stat"><span className="figure">{totals.remaining}</span><span className="caption">{t.remaining}</span></div><div className="summary-stat"><span className="figure">{totals.percent}%</span><span className="caption">{t.monthTarget}</span></div></div><div className="prayer-ledger">{prayerMeta.map((prayer, index) => { const value = counts[prayer.key]; const target = targets[prayer.key]; const progress = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0; const name = t.prayerNames[prayer.key]; return <article className="prayer-row" key={prayer.key} style={{ "--delay": `${index * 48}ms` } as React.CSSProperties}><div className="prayer-name"><span className="arabic">{prayer.arabic}</span><div><h3>{name}</h3><span className="caption">{timeState.at(timeState.times[prayer.key]) ? `${timeState.at(timeState.times[prayer.key])} · ` : ""}{timeState.current === prayer.key ? `${timeState.label} · ` : ""}{target} {t.planned}</span></div></div><div className="prayer-progress"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><span className="caption">{progress}%</span></div><div className="counter-control"><button className="step-button ghost" onClick={() => addMissed(prayer.key)} aria-label={`${t.addMissed} ${name}`} title={`${t.addMissed} · ${name}`}><Minus size={15} strokeWidth={1.6} /><span className="step-plus">+</span></button><button className="step-button" onClick={() => changeCount(prayer.key, -1)} aria-label={`${t.remove} ${name}`}><span>−</span></button><span className={`row-figure ${pulseKey === prayer.key ? "is-pulsing" : ""}`}>{value}</span><button className="step-button filled" onClick={() => changeCount(prayer.key, 1)} aria-label={`${t.add} ${name}`}><Plus size={18} strokeWidth={1.6} /></button></div></article>; })}</div><div className="ledger-footer"><span className="caption" role="status" aria-live="polite">{notice ?? t.ready}</span><button className="text-button" onClick={resetToday}><RotateCcw size={14} /> {t.reset}</button></div></> : activeView === "stats" ? <Stats counts={counts} targets={targets} totals={totals} history={history} t={t} /> : <Overview counts={counts} targets={targets} totals={totals} t={t} />}</div></section>
    }
    <HowItWorks t={t} />
    <QuickAdd counts={counts} t={t} enabled={!!user} onCount={(key) => changeCount(key, 1)} onMissed={addMissed} onLocked={() => goToAuth("signup")} />
    <footer className="site-footer container"><span>QazoTrack · {t.personal}</span><span>{t.footer}</span></footer>
  </main>;
}

/**
 * First-run data entry, implementing the original project's qaza spec.
 *
 * The reader supplies a date of birth, a gender and the date they began
 * praying regularly; the backlog is derived from those rather than typed in by
 * hand. Maturity (bulugh) is 12 lunar years for boys and 9 for girls — the
 * cautious figure from Hanafi guidance — and for women an average number of
 * menstruation days per month is excluded from the count.
 *
 * The estimate updates live as the form becomes valid, so the reader sees what
 * their answers imply before committing to them.
 */
/**
 * Reads a record left in localStorage by the versions of this app that had no
 * accounts, so an existing reader does not lose their work on the way in.
 */
function readLegacyRecord() {
  try {
    const profile = localStorage.getItem("qaza-profile");
    if (!profile) return null;
    const read = (key: string, fallback: unknown) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
    return {
      profile: JSON.parse(profile) as Profile,
      targets: read("qaza-targets", defaultTargets) as Counts,
      counts: read("qaza-counts", emptyCounts) as Counts,
      history: read("qaza-history", {}) as History,
    };
  } catch {
    return null;
  }
}

function clearLegacyRecord() {
  for (const key of ["qaza-profile", "qaza-targets", "qaza-counts", "qaza-history"]) localStorage.removeItem(key);
}

/**
 * The floating add button.
 *
 * Counting a prayer is the one thing a reader comes back to do, and until now
 * it meant scrolling to the ledger and finding the right row. This keeps it one
 * press away from anywhere on the page, on every view and at every scroll
 * position.
 *
 * It is present signed out too. There is no count to add to yet, so pressing it
 * opens the account form rather than the sheet — the same route every other
 * gated control takes, so the button is never simply inert.
 */
function QuickAdd({ counts, t, enabled, onCount, onMissed, onLocked }: { counts: Counts; t: Copy; enabled: boolean; onCount: (key: PrayerKey) => void; onMissed: (key: PrayerKey) => void; onLocked: () => void }) {
  const [open, setOpen] = useState(false);
  // Which button was last pressed, so the tick lands on that button rather than
  // on the row — the two actions move the number in opposite directions and the
  // confirmation has to say which one happened.
  const [flash, setFlash] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); } };
    const onClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Deferred, or the click that opened the sheet closes it again.
    const timer = window.setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const choose = (key: PrayerKey, kind: "count" | "missed") => {
    if (kind === "count") onCount(key); else onMissed(key);
    // The sheet stays open: a reader catching up on several prayers in one
    // sitting should not have to reopen it between each. The tick says it landed.
    const mark = `${key}:${kind}`;
    setFlash(mark);
    window.setTimeout(() => setFlash((current) => (current === mark ? null : current)), 1100);
  };

  return (
    <div className={`quick-add ${open ? "is-open" : ""}`} ref={root}>
      {open && enabled && (
        <div className="quick-sheet" role="dialog" aria-label={t.quickAddTitle}>
          <div className="quick-head">
            <h3>{t.quickAddTitle}</h3>
            <p className="caption">{t.quickAddNote}</p>
          </div>
          <ul className="quick-list">
            {prayerMeta.map((prayer, index) => {
              const name = t.prayerNames[prayer.key];
              return (
                <li key={prayer.key}>
                  <span className="arabic">{prayer.arabic}</span>
                  <span className="quick-name">{name}</span>
                  <span className="row-figure">{counts[prayer.key]}</span>
                  {/* Same vocabulary as the ledger rows: dashed records a debt,
                      filled records one paid off. Learned once, used in both. */}
                  <button
                    className={`quick-act ghost ${flash === `${prayer.key}:missed` ? "is-flashing" : ""}`}
                    onClick={() => choose(prayer.key, "missed")}
                    aria-label={`${t.addMissed} ${name}`}
                    title={`${t.addMissed} · ${name}`}
                  >
                    {flash === `${prayer.key}:missed` ? <Check size={14} strokeWidth={2.2} /> : <Minus size={14} strokeWidth={1.8} />}
                  </button>
                  <button
                    ref={index === 0 ? first : undefined}
                    className={`quick-act filled ${flash === `${prayer.key}:count` ? "is-flashing" : ""}`}
                    onClick={() => choose(prayer.key, "count")}
                    aria-label={`${t.add} ${name}`}
                    title={`${t.add} · ${name}`}
                  >
                    {flash === `${prayer.key}:count` ? <Check size={14} strokeWidth={2.2} /> : <Plus size={14} strokeWidth={1.8} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        className="quick-trigger"
        onClick={() => { if (!enabled) { onLocked(); return; } setOpen(!open); }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? t.quickAddClose : t.quickAdd}
        title={t.quickAdd}
      >
        <Plus size={22} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/**
 * What the app does, in four steps.
 *
 * A band at the foot of the page rather than a dialog. The steps are a real
 * sequence — an account has to exist before a plan can be worked out, and a
 * plan before there is anything to mark off — so they are numbered, and the
 * ordinals are set large enough to be the structure rather than a decoration.
 *
 * Each column reveals as it comes into view. That is the one piece of motion
 * here, and it serves reading order: the eye is walked left to right through a
 * sequence it needs to take in order.
 */
function HowItWorks({ t }: { t: Copy }) {
  const band = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = band.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) { setShown(true); return; }
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((entry) => entry.isIntersecting)) { setShown(true); observer.disconnect(); } },
      { rootMargin: "-12% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const steps = [
    { title: t.howStep1, body: t.howStep1Body },
    { title: t.howStep2, body: t.howStep2Body },
    { title: t.howStep3, body: t.howStep3Body },
    { title: t.howStep4, body: t.howStep4Body },
  ];

  return (
    <section className={`how-band ${shown ? "is-shown" : ""}`} id="how" ref={band}>
      <div className="container">
        <div className="section-intro">
          <div>
            <p className="label">{t.howLabel}</p>
            <h2 className="h2">{t.howTitle}</h2>
          </div>
          <p className="caption section-note">{t.private}</p>
        </div>
        <ol className="how-steps">
          {steps.map((step, index) => (
            <li key={step.title} style={{ "--step": index } as React.CSSProperties}>
              <span className="how-ordinal">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p className="caption">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Sign-up and sign-in.
 *
 * One form serves both, because they take the same two fields and differ only
 * in what the server does with them. It is a real <form>, so Enter submits and
 * a password manager can recognise the pair.
 */
function Auth({ t, mode, onModeChange, onAuthed }: { t: Copy; mode: "signup" | "login"; onModeChange: (mode: "signup" | "login") => void; onAuthed: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = mode === "signup" ? await signUp(email, password) : await logIn(email, password);
      onAuthed(user);
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.code : "badRequest");
      setBusy(false);
    }
  };

  return <section className="ledger-band" id="account"><div className="container">
    <div className="section-intro"><div><p className="label">{t.accountLabel}</p><h2 className="h2">{mode === "signup" ? t.signUpTitle : t.logInTitle}</h2></div><p className="caption section-note">{t.accountBody}</p></div>

    <form className="prayer-ledger" onSubmit={submit}>
      <div className="setup-row">
        <div><h3>{t.email}</h3></div>
        <div className="setup-field"><input className="setup-input setup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-label={t.email} /></div>
      </div>
      <div className="setup-row">
        <div><h3>{t.password}</h3><span className="caption">{t.passwordHint}</span></div>
        {/* The reveal sits inside the field's box so the eye reads as part of
            the input rather than a separate control beside it. */}
        <div className="setup-field"><div className="password-field"><input className="setup-input setup-email" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} aria-label={t.password} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t.hidePassword : t.showPassword} aria-pressed={showPassword} title={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}</button></div></div>
      </div>
      <div className="ledger-footer">
        <span className="caption" role="status" aria-live="polite">{error ? t.errors[error] : busy ? t.authWorking : ""}</span>
        <div className="hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => { onModeChange(mode === "signup" ? "login" : "signup"); setError(null); }}>{mode === "signup" ? t.haveAccount : t.noAccount}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{mode === "signup" ? t.signUp : t.logIn} <ArrowRight size={16} /></button>
        </div>
      </div>
    </form>
  </div></section>;
}

function Setup({ profile, t, firstRun, onSave, onCancel }: { profile: Profile | null; t: Copy; firstRun: boolean; onSave: (profile: Profile, targets: Counts) => void; onCancel: () => void }) {
  const today = localDay(new Date());
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? "");
  const [gender, setGender] = useState<"male" | "female">(profile?.gender ?? "male");
  const [startPraying, setStartPraying] = useState(profile?.startPrayingDate ?? "");
  const [notYet, setNotYet] = useState(profile ? profile.startPrayingDate === null : false);
  const [menstruation, setMenstruation] = useState(String(profile?.menstruationAvgDaysPerMonth ?? DEFAULT_MENSTRUATION_DAYS));

  const draft: Profile = {
    birthDate,
    gender,
    startPrayingDate: notYet || !startPraying ? null : startPraying,
    menstruationAvgDaysPerMonth: Math.max(0, Math.min(15, Number(menstruation) || 0)),
  };

  const issues = birthDate ? validateProfile(draft, today) : [];
  const message: Record<ValidationCode, string> = {
    birthDateMissing: t.errBirthMissing,
    birthDateFuture: t.errBirthFuture,
    birthDateOutOfRange: t.errBirthRange,
    startBeforeBulugh: t.errStartBefore,
    startInFuture: t.errStartFuture,
  };

  // Only computed once the answers are actually usable, so a half-filled form
  // never shows a misleading number.
  const estimate = birthDate && issues.length === 0 ? calculateQaza(draft, today) : null;

  const commit = () => {
    if (!estimate) return;
    const targets = Object.fromEntries(prayerMeta.map((prayer) => [prayer.key, estimate.perPrayer])) as Counts;
    onSave(draft, targets);
  };

  return <section className="ledger-band"><div className="container">
    <div className="section-intro"><div><p className="label">{t.setupLabel}</p><h2 className="h2">{t.setupTitle}</h2></div><p className="caption section-note">{t.setupBody}</p></div>

    <div className="prayer-ledger">
      <div className="setup-row">
        <div><h3>{t.birthDate}</h3><span className="caption">{t.bulughNote}</span></div>
        <div className="setup-field"><input className="setup-input setup-date" type="date" max={today} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} aria-label={t.birthDate} /></div>
      </div>

      <div className="setup-row">
        <div><h3>{t.gender}</h3></div>
        <div className="setup-field" role="radiogroup" aria-label={t.gender}>
          <button type="button" role="radio" aria-checked={gender === "male"} className={gender === "male" ? "chip active" : "chip"} onClick={() => setGender("male")}>{t.male}</button>
          <button type="button" role="radio" aria-checked={gender === "female"} className={gender === "female" ? "chip active" : "chip"} onClick={() => setGender("female")}>{t.female}</button>
        </div>
      </div>

      {gender === "female" && <div className="setup-row">
        <div><h3>{t.menstruation}</h3><span className="caption">{t.menstruationHelp}</span></div>
        <div className="setup-field"><input className="setup-input" type="number" min={0} max={15} inputMode="numeric" value={menstruation} onChange={(event) => setMenstruation(event.target.value)} aria-label={t.menstruation} /></div>
      </div>}

      <div className="setup-row">
        <div><h3>{t.startPraying}</h3><span className="caption">{notYet ? t.notYet : t.pickDate}</span></div>
        <div className="setup-field">
          <button type="button" aria-pressed={notYet} className={notYet ? "chip active" : "chip"} onClick={() => setNotYet((value) => !value)}>{t.notYet}</button>
          {!notYet && <input className="setup-input setup-date" type="date" max={today} value={startPraying} onChange={(event) => setStartPraying(event.target.value)} aria-label={t.startPraying} />}
        </div>
      </div>
    </div>

    {issues.length > 0 && <div className="setup-issues" role="alert">{issues.map((code) => <p className="caption" key={code}>{message[code]}</p>)}</div>}

    {estimate && <div className="summary-rail setup-estimate">
      <div className="summary-main"><span className="figure">{estimate.totalPrayers}</span><span className="caption">{t.estimateLabel}</span></div>
      <div className="summary-stat"><span className="figure">{estimate.perPrayer}</span><span className="caption">{t.perPrayer}</span></div>
      <div className="summary-stat"><span className="figure">{estimate.bulughDate}</span><span className="caption">{t.bulughDate}</span></div>
    </div>}

    <div className="ledger-footer">
      <span className="caption">{estimate ? `${estimate.totalDays} ${t.daysCounted}${estimate.excludedDays > 0 ? ` · ${estimate.excludedDays} ${t.excluded}` : ""}` : ""}</span>
      <div className="hero-actions">
        {!firstRun && <button className="btn btn-secondary" onClick={onCancel}>{t.setupCancel}</button>}
        <button className="btn btn-primary" disabled={!estimate} onClick={commit}>{t.setupSave} <ArrowRight size={16} /></button>
      </div>
    </div>
  </div></section>;
}


/**
 * Stats. Descriptive, never gamified — the product's own copy promises "no
 * streaks, no pressure", so this reports what happened and what it implies,
 * and makes no judgement about consistency.
 *
 * The charts are hand-drawn SVG rather than a chart library: the bars reuse
 * this app's own vocabulary (hairline track, accent fill, Upper Clock figures)
 * and a general-purpose library would fight all three while adding far more
 * weight than two simple charts justify.
 */
function Stats({ counts, targets, totals, history, t }: { counts: Counts; targets: Counts; totals: { completed: number; target: number; remaining: number; percent: number }; history: History; t: Copy }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - index));
    const key = localDay(date);
    const entry = history[key] ?? {};
    return { key, label: `${date.getDate()}`, total: prayerMeta.reduce((sum, p) => sum + (entry[p.key] ?? 0), 0) };
  });

  const windowTotal = days.reduce((sum, day) => sum + day.total, 0);
  const busiest = Math.max(1, ...days.map((day) => day.total));
  const activeDays = days.filter((day) => day.total > 0).length;
  // Averaged over days actually used, not over the whole window: a reader who
  // prays in bursts should not be told their pace is near zero.
  const perDay = activeDays > 0 ? windowTotal / activeDays : 0;
  const daysLeft = perDay > 0 ? Math.ceil(totals.remaining / perDay) : null;
  const finish = daysLeft === null ? null : new Date(today.getTime() + daysLeft * 86400000);

  return <div className="overview">
    <div className="section-intro"><div><p className="label">{t.stats}</p><h2 className="h2">{t.statsTitle}</h2></div><p className="caption section-note">{t.statsNote}</p></div>

    <div className="summary-rail">
      <div className="summary-main"><CountUp className="figure" value={totals.completed} /><span className="caption">{t.countedToday}</span></div>
      <div className="summary-stat"><CountUp className="figure" value={totals.remaining} /><span className="caption">{t.remaining}</span></div>
      <div className="summary-stat"><CountUp className="figure" value={totals.percent} suffix="%" /><span className="caption">{t.monthTarget}</span></div>
    </div>

    {/*
      A single ratio against a limit is a meter, not a ring. A two-slice donut
      makes the reader compare arc lengths to answer a question a labelled track
      answers exactly, so the track carries the ends as direct labels and the
      figure above it is the headline.
    */}
    <section className="meter" aria-label={`${totals.completed} / ${totals.target}`}>
      <div className="meter-head">
        <p className="label">{t.done}</p>
        <p className="caption"><CountUp value={totals.completed} /> <span className="meter-of">/ {totals.target.toLocaleString()}</span></p>
      </div>
      <div className="meter-track">
        <span className="meter-fill" style={{ width: `${totals.percent}%` }} />
      </div>
      <div className="meter-foot">
        <span className="caption">{totals.percent}% · {t.done}</span>
        <span className="caption">{totals.remaining.toLocaleString()} {t.stillToGo}</span>
      </div>
    </section>

    <ProgressOverTime history={history} t={t} />

    <div className="stats-grid">
      <section className="stats-card">
        <p className="label">{t.byPrayer}</p>
        <div className="stats-bars">{prayerMeta.map((prayer) => {
          const target = targets[prayer.key];
          const value = counts[prayer.key];
          const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
          return <div className="stats-bar-row" key={prayer.key}>
            <span className="caption stats-bar-name">{t.prayerNames[prayer.key]}</span>
            <span className="stats-bar-track"><span className="stats-bar-fill" data-empty={value === 0} style={{ width: `${pct}%` }} /></span>
            <span className="row-figure stats-bar-value">{value}<small> / {target}</small></span>
          </div>;
        })}</div>
      </section>

      <section className="stats-card">
        <p className="label">{t.last30}</p>
        {windowTotal === 0
          ? <p className="caption stats-empty">{t.noActivity}</p>
          : <svg className="stats-chart" viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label={`${t.last30}: ${windowTotal}`}>
              {days.map((day, index) => {
                const height = (day.total / busiest) * 74;
                // A hover layer is the default for a plotted chart. The <title> is the
                // tooltip and the accessible name at once, and the value is still
                // reachable without it from the caption below, so nothing is gated
                // behind the pointer. The hit rect is the full column height so the
                // target is never a two-pixel sliver.
                return <g key={day.key} className={day.total > 0 ? "stats-col-group is-on" : "stats-col-group"}>
                  <title>{`${day.key} · ${day.total}`}</title>
                  <rect x={index * 10 + 1.5} y={80 - height} width={7} height={Math.max(day.total > 0 ? 2 : 0, height)} rx={0} className={day.total > 0 ? "stats-col is-on" : "stats-col"} />
                  <rect x={index * 10} y={0} width={10} height={80} fill="transparent" />
                </g>;
              })}
              <line x1="0" y1="80.5" x2="300" y2="80.5" className="stats-axis" />
            </svg>}
        {windowTotal > 0 && <p className="caption">{windowTotal} · {activeDays}/30</p>}
      </section>

      <section className="stats-card">
        <p className="label">{t.pace}</p>
        <div className="stats-figures">
          <div><span className="figure">{perDay > 0 ? Math.round(perDay * 10) / 10 : "—"}</span><span className="caption">{t.perDay}</span></div>
          <div>
            <span className="figure">{totals.remaining === 0 ? t.done : finish ? localDay(finish) : "—"}</span>
            <span className="caption">{totals.remaining === 0 ? t.projected : finish ? `${t.projected} · ${t.atThisPace.toLowerCase()}` : t.noProjection}</span>
          </div>
        </div>
      </section>
    </div>
  </div>;
}


/**
 * Cumulative prayers made up, from the first recorded day to today.
 *
 * The y-axis is scaled to what has actually been made up rather than to the
 * whole backlog. Against a five-figure target the curve would be a flat line
 * on the floor and would say nothing; this way the shape of the reader's own
 * effort is legible, and the figures beside it keep the scale honest.
 *
 * x is spaced by real elapsed days, not by entry index, so a gap in the record
 * reads as a gap in time rather than being silently compressed away.
 */
function ProgressOverTime({ history, t }: { history: History; t: Copy }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const dayTotals = Object.entries(history)
    .map(([day, entry]) => [day, prayerMeta.reduce((sum, p) => sum + (entry[p.key] ?? 0), 0)] as const)
    .filter(([, total]) => total > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (dayTotals.length < 2) {
    return <section className="stats-card stats-overtime">
      <p className="label">{t.overTime}</p>
      <p className="caption stats-empty">{t.overTimeEmpty}</p>
    </section>;
  }

  const dayMs = 86400000;
  const start = Date.parse(dayTotals[0][0]);
  const end = Math.max(Date.parse(dayTotals[dayTotals.length - 1][0]), Date.parse(localDay(new Date())));
  const span = Math.max(1, Math.round((end - start) / dayMs));

  let running = 0;
  const points = dayTotals.map(([day, total]) => {
    running += total;
    return { x: Math.round((Date.parse(day) - start) / dayMs) / span, y: running };
  });
  const peak = running;

  const W = 600;
  const H = 150;
  const PAD = 8;
  const px = (x: number) => PAD + x * (W - PAD * 2);
  const py = (y: number) => H - PAD - (peak > 0 ? y / peak : 0) * (H - PAD * 2);

  // Start the line on the floor the day before the first entry, so the curve
  // rises from zero rather than appearing to begin mid-air.
  const coords = [`${PAD},${H - PAD}`, ...points.map((pt) => `${px(pt.x)},${py(pt.y)}`)];
  // Carry the last value flat to today, which is where the axis ends.
  const lastX = px(points[points.length - 1].x);
  if (lastX < W - PAD) coords.push(`${W - PAD},${py(peak)}`);
  const line = coords.join(" ");
  const area = `${line} ${W - PAD},${H - PAD}`;

  // The point the reader is inspecting. Null means none, and the header falls
  // back to the running total.
  const active = hovered === null ? null : points[Math.max(0, Math.min(points.length - 1, hovered))];
  const activeDay = hovered === null ? null : dayTotals[Math.max(0, Math.min(dayTotals.length - 1, hovered))][0];

  /** Nearest point to the pointer, in the SVG's own coordinates. */
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const x = ((event.clientX - box.left) / box.width) * W;
    let best = 0;
    let bestGap = Infinity;
    points.forEach((pt, index) => {
      const gap = Math.abs(px(pt.x) - x);
      if (gap < bestGap) { bestGap = gap; best = index; }
    });
    setHovered(best);
  };

  return <section className="stats-card stats-overtime">
    <div className="stats-overtime-head">
      <p className="label">{t.overTime}</p>
      <p className="caption" role="status" aria-live="polite">
        {active ? `${activeDay} · ${active.y} ${t.total}` : `${dayTotals[0][0]} · ${peak} ${t.total}`}
      </p>
    </div>
    <div className="stats-plot">
    <svg
      className="stats-line is-interactive"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${t.overTime}: ${peak}`}
      tabIndex={0}
      onPointerMove={pick}
      onPointerLeave={() => setHovered(null)}
      onBlur={() => setHovered(null)}
      onKeyDown={(event) => {
        // Arrow keys walk the series, so the figures are reachable without a
        // pointer. No animation on these: they repeat too fast to animate.
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1;
        setHovered((current) => {
          const next = (current ?? points.length - 1) + step;
          return Math.max(0, Math.min(points.length - 1, next));
        });
      }}
    >
      <polygon className="stats-line-area" points={area} />
      <polyline className="stats-line-path" points={line} />
      <line className="stats-axis" x1="0" y1={H - PAD + 0.5} x2={W} y2={H - PAD + 0.5} />
      {active && <line className="stats-cursor" x1={px(active.x)} y1={PAD} x2={px(active.x)} y2={H - PAD} />}
    </svg>
    {/* The dot is HTML, not SVG. This chart stretches to its container with
        preserveAspectRatio="none", which turns any circle inside it into an
        ellipse; positioning it as a percentage keeps it round at every width. */}
    {active && <span
      className="stats-dot"
      style={{ left: `${(px(active.x) / W) * 100}%`, top: `${(py(active.y) / H) * 100}%` }}
      aria-hidden="true"
    />}
    </div>
    <p className="caption">{t.overTimeNote}</p>
  </section>;
}


function Overview({ counts, targets, totals, t }: { counts: Counts; targets: Counts; totals: { completed: number; target: number; remaining: number; percent: number }; t: Copy }) { return <div className="overview"><div className="section-intro"><div><p className="label">{t.overviewLabel}</p><h2 className="h2">{t.overviewTitle}</h2></div><p className="caption section-note">{t.overviewNote}</p></div><div className="overview-grid"><div className="overview-hero"><span className="figure huge">{totals.completed}</span><p className="caption">{t.countedOf.replace("{n}", String(totals.target))}</p><div className="big-progress"><span style={{ width: `${totals.percent}%` }} /></div><p className="caption">{totals.remaining} {t.stillToGo} · {totals.percent}% {t.targetOf}</p></div><div className="overview-list">{prayerMeta.map((prayer) => <div className="overview-item" key={prayer.key}><div><span className="arabic">{prayer.arabic}</span><strong>{t.prayerNames[prayer.key]}</strong></div><span className="figure">{counts[prayer.key]} <small>/ {targets[prayer.key]}</small></span></div>)}</div></div></div>; }
