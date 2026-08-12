import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Moon, Plus, RotateCcw, Settings2, Sun } from "lucide-react";
import { calculateQaza, DEFAULT_MENSTRUATION_DAYS, validateProfile, type Profile, type ValidationCode } from "@/lib/qaza";

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
const prayerTimes = [
  { key: "fajr", time: "05:00" }, { key: "dhuhr", time: "12:30" }, { key: "asr", time: "16:30" }, { key: "maghrib", time: "19:30" }, { key: "isha", time: "21:00" },
] as const;

const copy = {
  uz: {
    stats: "Statistika", statsTitle: "Rivojingiz bir qarashda.", statsNote: "Faqat qayd — solishtiruv ham, ketma-ketlik ham yo‘q.", byPrayer: "Namozlar bo‘yicha", last30: "So‘nggi 30 kun", pace: "Sur‘at", perDay: "Kuniga o‘rtacha", projected: "Taxminiy tugash", atThisPace: "Shu sur‘atda", noActivity: "Hali yozuv yo‘q — birinchi namozdan keyin shu yerda ko‘rinadi.", noProjection: "Sur‘at aniqlangach ko‘rsatiladi.", done: "Bajarildi", 
    today: "Bugun", overview: "Umumiy", adjust: "Rejani sozlash", heroTitle: <>Qazo namozlaringizni<br />birin-ketin ado eting.</>, heroBody: "Qoldirilgan namozlarni ko‘rinadigan, boshqariladigan va to‘g‘ri yo‘nalishda saqlash uchun sodda makon.", countPrayer: "Namoz sanash", howItWorks: "Qanday ishlaydi", intro: "Ketma-ketlik ham, bosim ham yo‘q. Faqat joy ajratgan namozlaringizning aniq qaydi — bir sokin qadamdan.", openLedger: "Bugungi daftarni ochish", adjustPlan: "Rejamni sozlash", trust: "Barqaror rivoj uchun sodda.", ledger: "Bugungi daftar", ledgerTitle: "Kichik qadam ham qadam.", ledgerNote: <>Har bir ado etilgan namozdan keyin + ni bosing.<br />Keyin istalgan payt o‘zgartirishingiz mumkin.</>, countedToday: "bugun sanalgan namoz", remaining: "rejada qolgan", monthTarget: "oylik maqsadning", planned: "rejalashtirilgan", reset: "Bugunni tozalash", ready: "Boshlashga tayyor.", complete: "Bir namoz bajarildi.", movedBack: "Bir namoz ro‘yxatga qaytarildi.", cleared: "Bugungi yozuvlar tozalandi.", private: "Rivojingiz ushbu brauzerda maxfiy saqlanadi.", future: "Sozlamalaringiz kelajakdagi yangilanish uchun tayyor.", planReady: "Rejangizni istalgan payt o‘zgartirishingiz mumkin.", overviewLabel: "Reja ko‘rinishi", overviewTitle: "Oyingiz bir qarashda.", overviewNote: <>Keyingi e’tiboringiz qayerda bo‘lishi<br />mumkinligini sodda ko‘ring.</>, countedOf: "{n} ta rejalashtirilgan namozdan sanaldi", stillToGo: "hali qoldi", local: "mahalliy vaqt", setupLabel: "Sozlash", setupTitle: "Nechta namozni qazo qilyapsiz?", setupBody: "Tug‘ilgan sanangiz va namozni muntazam o‘qiy boshlagan sanangizni kiriting — qolganini o‘zimiz hisoblaymiz.", birthDate: "Tug‘ilgan sana", gender: "Jins", male: "Erkak", female: "Ayol", startPraying: "Namozni qachon boshlagansiz", notYet: "Hali muntazam emas", pickDate: "Sanani tanlang", menstruation: "Oyiga hayz kunlari", menstruationHelp: "O‘rtacha. Bu kunlar hisobdan chiqariladi.", bulughNote: "Balog‘at yoshi: o‘g‘il bolalar uchun 12 qamariy yil, qiz bolalar uchun 9 qamariy yil — hanafiy manbalaridagi ehtiyotkor o‘lchov.", estimateLabel: "Hisob", bulughDate: "Balog‘at sanasi", daysCounted: "kun hisoblandi", excluded: "kun chiqarildi", perPrayer: "Har bir namozdan", errBirthMissing: "Tug‘ilgan sanani kiriting.", errBirthFuture: "Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.", errBirthRange: "Sana 1937–2076 oralig‘ida bo‘lishi kerak.", errStartBefore: "Bu sana balog‘at sanasidan oldin.", errStartFuture: "Bu sana kelajakda.", setupSave: "Kuzatishni boshlash", setupCancel: "Bekor qilish", setupSaved: "Rejangiz saqlandi.", now: "Hozir", prayerNames: { fajr: "Bomdod", dhuhr: "Peshin", asr: "Asr", maghrib: "Shom", isha: "Xufton" }, firstLight: "Tong oldi", midday: "Peshin", lateAfternoon: "Kechki tush", afterSunset: "Quyosh botgach", night: "Tun", sunSettling: "Kun sokinlashmoqda.", steady: "Shoshilmasdan, barqaror.", prayerTime: "{name} vaqti", personal: "Shaxsiy foydalanish", footer: "Barqaror rivoj uchun yaratilgan", remove: "Bir namozni olib tashlash", add: "Bir namoz qo‘shish", targetOf: "maqsadning",
  },
  en: {
    stats: "Stats", statsTitle: "Your progress at a glance.", statsNote: "A record only — no comparisons and no streaks.", byPrayer: "By prayer", last30: "Last 30 days", pace: "Pace", perDay: "Average per day", projected: "Projected finish", atThisPace: "At this pace", noActivity: "Nothing recorded yet — your first prayer will show up here.", noProjection: "Shown once there is a pace to measure.", done: "Done", 
    today: "Today", overview: "Overview", adjust: "Adjust plan", heroTitle: <>Complete your missed prayers<br />one calm step at a time.</>, heroBody: "A simple place to keep your missed prayers visible, manageable, and moving in the right direction.", countPrayer: "Count a prayer", howItWorks: "How it works", intro: "No streaks. No pressure. Just a clear record of the prayers you’ve made space for, one quiet entry at a time.", openLedger: "Open today’s ledger", adjustPlan: "Adjust my plan", trust: "Kept simple for steady progress.", ledger: "Today’s ledger", ledgerTitle: "A little done is still done.", ledgerNote: <>Tap + after each prayer you make up.<br />You can always adjust it later.</>, countedToday: "prayers counted today", remaining: "remaining in this plan", monthTarget: "of this month’s target", planned: "planned", reset: "Reset today", ready: "Ready when you are.", complete: "One prayer marked complete.", movedBack: "One prayer moved back to your list.", cleared: "Today’s entries have been cleared.", private: "Your progress is stored privately in this browser.", future: "Your settings are ready for a future update.", planReady: "Your plan can be adjusted whenever you need.", overviewLabel: "Plan overview", overviewTitle: "Your month at a glance.", overviewNote: <>A simple view of where your attention<br />can go next.</>, countedOf: "of {n} planned prayers counted", stillToGo: "still to go", local: "local time", setupLabel: "Set up", setupTitle: "How many prayers are you making up?", setupBody: "Enter your date of birth and when you began praying regularly — the rest is worked out for you.", birthDate: "Date of birth", gender: "Gender", male: "Male", female: "Female", startPraying: "When you began praying regularly", notYet: "Not regularly yet", pickDate: "Pick a date", menstruation: "Menstruation days per month", menstruationHelp: "On average. These days are excluded from the count.", bulughNote: "Maturity is taken as 12 lunar years for boys and 9 for girls — the cautious figure used in Hanafi guidance.", estimateLabel: "Estimate", bulughDate: "Maturity date", daysCounted: "days counted", excluded: "days excluded", perPrayer: "Of each prayer", errBirthMissing: "Enter your date of birth.", errBirthFuture: "That date is in the future.", errBirthRange: "The date needs to fall between 1937 and 2076.", errStartBefore: "That is before your maturity date.", errStartFuture: "That date is in the future.", setupSave: "Start tracking", setupCancel: "Cancel", setupSaved: "Your plan has been saved.", now: "Now", prayerNames: { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" }, firstLight: "First light", midday: "Midday", lateAfternoon: "Late afternoon", afterSunset: "After sunset", night: "Night", sunSettling: "The day is settling.", steady: "Steady, not hurried.", prayerTime: "{name} time", personal: "Personal use", footer: "Built for steady progress", remove: "Remove one prayer", add: "Add one prayer", targetOf: "of this month’s target",
  },
  ru: {
    stats: "Статистика", statsTitle: "Ваш прогресс одним взглядом.", statsNote: "Только запись — без сравнений и без серий.", byPrayer: "По молитвам", last30: "Последние 30 дней", pace: "Темп", perDay: "В среднем в день", projected: "Ожидаемое завершение", atThisPace: "При таком темпе", noActivity: "Пока нет записей — первая молитва появится здесь.", noProjection: "Появится, когда будет что измерять.", done: "Готово", 
    today: "Сегодня", overview: "Обзор", adjust: "Изменить план", heroTitle: <>Восполняйте пропущенные молитвы<br />шаг за спокойным шагом.</>, heroBody: "Простое место, где пропущенные молитвы остаются видимыми, управляемыми и движутся в правильном направлении.", countPrayer: "Считать молитву", howItWorks: "Как это работает", intro: "Без серий и давления. Только ясная запись молитв, которым вы нашли место, — один спокойный шаг за раз.", openLedger: "Открыть дневник", adjustPlan: "Изменить мой план", trust: "Просто для устойчивого прогресса.", ledger: "Дневник сегодня", ledgerTitle: "Даже малое дело — дело.", ledgerNote: <>Нажимайте + после каждой восполненной молитвы.<br />Позже всё можно изменить.</>, countedToday: "молитв сегодня", remaining: "осталось в плане", monthTarget: "от цели месяца", planned: "запланировано", reset: "Сбросить сегодня", ready: "Готово, когда готовы вы.", complete: "Одна молитва отмечена.", movedBack: "Одна молитва возвращена в список.", cleared: "Записи за сегодня очищены.", private: "Ваш прогресс хранится конфиденциально в этом браузере.", future: "Настройки будут доступны в будущем обновлении.", planReady: "План можно изменить в любое время.", overviewLabel: "Обзор плана", overviewTitle: "Ваш месяц одним взглядом.", overviewNote: <>Простой взгляд на то, куда<br />направить внимание дальше.</>, countedOf: "из {n} запланированных молитв отмечено", stillToGo: "осталось", local: "местное время", setupLabel: "Настройка", setupTitle: "Сколько молитв вы восполняете?", setupBody: "Укажите дату рождения и когда вы начали регулярно молиться — остальное мы посчитаем.", birthDate: "Дата рождения", gender: "Пол", male: "Мужской", female: "Женский", startPraying: "Когда начали регулярно молиться", notYet: "Пока не регулярно", pickDate: "Выберите дату", menstruation: "Дней менструации в месяц", menstruationHelp: "В среднем. Эти дни исключаются из подсчёта.", bulughNote: "Совершеннолетие берётся как 12 лунных лет для мальчиков и 9 для девочек — осторожная оценка из ханафитских источников.", estimateLabel: "Расчёт", bulughDate: "Дата совершеннолетия", daysCounted: "дней учтено", excluded: "дней исключено", perPrayer: "Каждой молитвы", errBirthMissing: "Укажите дату рождения.", errBirthFuture: "Эта дата в будущем.", errBirthRange: "Дата должна быть между 1937 и 2076.", errStartBefore: "Это раньше даты совершеннолетия.", errStartFuture: "Эта дата в будущем.", setupSave: "Начать отслеживание", setupCancel: "Отмена", setupSaved: "Ваш план сохранён.", now: "Сейчас", prayerNames: { fajr: "Фаджр", dhuhr: "Зухр", asr: "Аср", maghrib: "Магриб", isha: "Иша" }, firstLight: "Перед рассветом", midday: "Полдень", lateAfternoon: "После полудня", afterSunset: "После заката", night: "Ночь", sunSettling: "День успокаивается.", steady: "Спокойно и без спешки.", prayerTime: "Время {name}", personal: "Для личного использования", footer: "Создано для устойчивого прогресса", remove: "Убрать одну молитву", add: "Добавить одну молитву", targetOf: "от цели месяца",
  },
} as const;

type Copy = (typeof copy)[Language];

function getTimeState(date: Date, language: Language) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const sunrise = 5 * 60;
  const sunset = 21 * 60;
  const isNight = minutes < sunrise || minutes >= sunset;
  const progress = Math.max(0, Math.min(1, (minutes - sunrise) / (sunset - sunrise)));
  let current = prayerTimes[prayerTimes.length - 1];
  for (const prayer of prayerTimes) { const [hours, mins] = prayer.time.split(":").map(Number); if (minutes >= hours * 60 + mins) current = prayer; }
  const localized = copy[language];
  const labels: Record<PrayerKey, string> = { fajr: localized.firstLight, dhuhr: localized.midday, asr: localized.lateAfternoon, maghrib: localized.afterSunset, isha: localized.night };
  return { isNight, progress, current, label: labels[current.key], formatted: date.toLocaleTimeString(language === "uz" ? "uz-UZ" : language === "ru" ? "ru-RU" : "en-US", { hour: "numeric", minute: "2-digit" }) };
}

export default function Home() {
  const [counts, setCounts] = useState<Counts>(() => { try { const saved = localStorage.getItem("qaza-counts"); return saved ? JSON.parse(saved) : emptyCounts; } catch { return emptyCounts; } });
  // A saved plan is what marks this install as set up. Without one the reader
  // has never told us anything, so the setup screen comes first.
  const [targets, setTargets] = useState<Counts>(() => { try { const saved = localStorage.getItem("qaza-targets"); return saved ? JSON.parse(saved) : defaultTargets; } catch { return defaultTargets; } });
  const [profile, setProfile] = useState<Profile | null>(() => { try { const saved = localStorage.getItem("qaza-profile"); return saved ? JSON.parse(saved) : null; } catch { return null; } });
  // A saved profile is what marks this install as set up.
  const [showSetup, setShowSetup] = useState(() => !localStorage.getItem("qaza-profile"));
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("qaza-language") as Language) || "en");
  const [activeView, setActiveView] = useState<"today" | "overview" | "stats">("today");
  const [history, setHistory] = useState<History>(() => { try { const saved = localStorage.getItem("qaza-history"); return saved ? JSON.parse(saved) : {}; } catch { return {}; } });
  const [notice, setNotice] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<PrayerKey | null>(null);
  const [themeOverride, setThemeOverride] = useState<"day" | "night" | null>(() => { const saved = localStorage.getItem("qaza-theme"); return saved === "day" || saved === "night" ? saved : null; });
  const [now, setNow] = useState(() => new Date());
  const t = copy[language];
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem("qaza-counts", JSON.stringify(counts)); }, [counts]);
  useEffect(() => { localStorage.setItem("qaza-history", JSON.stringify(history)); }, [history]);
  useEffect(() => { if (!showSetup) localStorage.setItem("qaza-targets", JSON.stringify(targets)); }, [targets, showSetup]);
  useEffect(() => { localStorage.setItem("qaza-language", language); }, [language]);
  const timeState = getTimeState(now, language);
  // The clock decides unless the reader has explicitly chosen.
  const isNight = themeOverride ? themeOverride === "night" : timeState.isNight;
  const toggleTheme = () => { const next = isNight ? "day" : "night"; setThemeOverride(next); localStorage.setItem("qaza-theme", next); };
  const totals = useMemo(() => { const completed = Object.values(counts).reduce((sum, value) => sum + value, 0); const target = Object.values(targets).reduce((sum, value) => sum + value, 0); return { completed, target, remaining: target - completed, percent: Math.round((completed / target) * 100) }; }, [counts, targets]);
  const changeCount = (key: PrayerKey, delta: number) => {
    setCounts((current) => {
      const next = Math.max(0, current[key] + delta);
      // Only record a change that actually happened — pressing minus at zero
      // must not write a phantom entry into the history.
      if (next !== current[key]) {
        const day = new Date().toISOString().slice(0, 10);
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
  const openLedger = () => { setActiveView("today"); window.setTimeout(() => document.getElementById("prayer-ledger")?.scrollIntoView({ behavior: "smooth" }), 0); };
  const resetToday = () => { setCounts(Object.fromEntries(Object.keys(emptyCounts).map((key) => [key, 0])) as Counts); setHistory({}); setNotice(t.cleared); };

  return <main className={`site-shell ${isNight ? "night" : "day"}`} id="top">
    <header className="site-header container"><a className="brand" href="#top" aria-label="QazoTrack home"><img className="brand-logo" src="/qazotrack-logo.png" alt="" aria-hidden="true" /><span className="brand-wordmark">QazoTrack</span></a><nav className="top-nav" aria-label="Primary navigation"><button className={activeView === "today" ? "chip active" : "chip"} onClick={() => setActiveView("today")}>{t.today}</button><button className={activeView === "overview" ? "chip active" : "chip"} onClick={() => setActiveView("overview")}>{t.overview}</button><button className={activeView === "stats" ? "chip active" : "chip"} onClick={() => setActiveView("stats")}>{t.stats}</button><button className="nav-cta" onClick={() => setShowSetup(true)}>{t.adjust} <ArrowRight size={14} /></button><div className="language-switcher" role="group" aria-label="Language"><span className="language-current">{languages.find((item) => item.key === language)?.flag}</span>{languages.map((item) => <button key={item.key} className={language === item.key ? "language-button active" : "language-button"} onClick={() => setLanguage(item.key)} aria-label={item.label} title={item.label}>{item.flag}<span>{item.key.toUpperCase()}</span></button>)}</div><button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme" aria-pressed={isNight}>{isNight ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />}</button></nav></header>
    <section className="visual-stage"><div className="hero container"><div className="hero-copy"><h1 className="display">{t.heroTitle}</h1><p className="prose">{t.heroBody}</p><div className="hero-actions"><button className="btn btn-primary" onClick={openLedger}>{t.countPrayer} <ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={() => setNotice(t.private)}>{t.howItWorks} <ChevronRight size={15} /></button></div></div><div className="hero-visual-wrap"><div id="hero-visual" className="gradient-visual"><div className="day-arc" aria-hidden="true"><span className="sun-marker" style={{ "--sun-progress": timeState.progress } as React.CSSProperties} /></div><SolarSystem /><div className="sun-status"><span className="sun-kicker">{t.now} · {timeState.formatted}</span><strong>{t.prayerTime.replace("{name}", t.prayerNames[timeState.current.key])}</strong><span>{timeState.label} · {t.local}</span></div><span className="gradient-caption">{isNight ? t.sunSettling : t.steady}</span></div><div className="stat-stack"><div><span className="figure">{totals.completed}</span><span className="caption">{t.countedToday}</span></div><div><span className="figure">{totals.remaining}</span><span className="caption">{t.remaining}</span></div><div><span className="figure">{totals.percent}%</span><span className="caption">{t.monthTarget}</span></div></div></div></div><div className="intro-band"><div className="container intro-grid"><div><p className="intro-copy">{t.intro}</p><div className="hero-actions"><button className="btn btn-primary" onClick={openLedger}>{t.openLedger} <ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={() => setShowSetup(true)}>{t.adjustPlan} <Settings2 size={15} /></button></div></div><p className="trust-line"><span className="trust-dot" />{t.trust}</p></div></div></section>
    {showSetup ? <Setup profile={profile} t={t} firstRun={!localStorage.getItem("qaza-profile")} onCancel={() => setShowSetup(false)} onSave={(nextProfile, nextTargets) => { setProfile(nextProfile); setTargets(nextTargets); localStorage.setItem("qaza-profile", JSON.stringify(nextProfile)); localStorage.setItem("qaza-targets", JSON.stringify(nextTargets)); setShowSetup(false); setNotice(t.setupSaved); }} /> :
    <section className="ledger-band"><div className="container">{activeView === "today" ? <><div className="section-intro"><div><p className="label">{t.ledger}</p><h2 className="h2">{t.ledgerTitle}</h2></div><p className="caption section-note">{t.ledgerNote}</p></div><div id="prayer-ledger" className="summary-rail"><div className="summary-main"><span className="figure">{totals.completed}</span><span className="caption">{t.countedToday}</span></div><div className="summary-stat"><span className="figure">{totals.remaining}</span><span className="caption">{t.remaining}</span></div><div className="summary-stat"><span className="figure">{totals.percent}%</span><span className="caption">{t.monthTarget}</span></div></div><div className="prayer-ledger">{prayerMeta.map((prayer, index) => { const value = counts[prayer.key]; const target = targets[prayer.key]; const progress = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0; const name = t.prayerNames[prayer.key]; return <article className="prayer-row" key={prayer.key} style={{ "--delay": `${index * 48}ms` } as React.CSSProperties}><div className="prayer-name"><span className="arabic">{prayer.arabic}</span><div><h3>{name}</h3><span className="caption">{timeState.current.key === prayer.key ? `${timeState.label} · ` : ""}{target} {t.planned}</span></div></div><div className="prayer-progress"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><span className="caption">{progress}%</span></div><div className="counter-control"><button className="step-button" onClick={() => changeCount(prayer.key, -1)} aria-label={`${t.remove} ${name}`}><span>−</span></button><span className={`row-figure ${pulseKey === prayer.key ? "is-pulsing" : ""}`}>{value}</span><button className="step-button filled" onClick={() => changeCount(prayer.key, 1)} aria-label={`${t.add} ${name}`}><Plus size={18} strokeWidth={1.6} /></button></div></article>; })}</div><div className="ledger-footer"><span className="caption" role="status" aria-live="polite">{notice ?? t.ready}</span><button className="text-button" onClick={resetToday}><RotateCcw size={14} /> {t.reset}</button></div></> : activeView === "stats" ? <Stats counts={counts} targets={targets} totals={totals} history={history} t={t} /> : <Overview counts={counts} targets={targets} totals={totals} t={t} />}</div></section>
    }
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
function Setup({ profile, t, firstRun, onSave, onCancel }: { profile: Profile | null; t: Copy; firstRun: boolean; onSave: (profile: Profile, targets: Counts) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
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
    const key = date.toISOString().slice(0, 10);
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
      <div className="summary-main"><span className="figure">{totals.completed}</span><span className="caption">{t.countedToday}</span></div>
      <div className="summary-stat"><span className="figure">{totals.remaining}</span><span className="caption">{t.remaining}</span></div>
      <div className="summary-stat"><span className="figure">{totals.percent}%</span><span className="caption">{t.monthTarget}</span></div>
    </div>

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
                return <rect key={day.key} x={index * 10 + 1.5} y={80 - height} width={7} height={Math.max(day.total > 0 ? 2 : 0, height)} rx={0} className={day.total > 0 ? "stats-col is-on" : "stats-col"} />;
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
            <span className="figure">{totals.remaining === 0 ? t.done : finish ? finish.toISOString().slice(0, 10) : "—"}</span>
            <span className="caption">{totals.remaining === 0 ? t.projected : finish ? `${t.projected} · ${t.atThisPace.toLowerCase()}` : t.noProjection}</span>
          </div>
        </div>
      </section>
    </div>
  </div>;
}

function SolarSystem() { return <div className="gradient-orbit solar-system" aria-hidden="true"><span className="orbit orbit-one"><i className="planet planet-one" /></span><span className="orbit orbit-two"><i className="planet planet-two" /></span><span className="orbit orbit-three"><i className="planet planet-three" /></span><span className="sun-core" /></div>; }

function Overview({ counts, targets, totals, t }: { counts: Counts; targets: Counts; totals: { completed: number; target: number; remaining: number; percent: number }; t: Copy }) { return <div className="overview"><div className="section-intro"><div><p className="label">{t.overviewLabel}</p><h2 className="h2">{t.overviewTitle}</h2></div><p className="caption section-note">{t.overviewNote}</p></div><div className="overview-grid"><div className="overview-hero"><span className="figure huge">{totals.completed}</span><p className="caption">{t.countedOf.replace("{n}", String(totals.target))}</p><div className="big-progress"><span style={{ width: `${totals.percent}%` }} /></div><p className="caption">{totals.remaining} {t.stillToGo} · {totals.percent}% {t.targetOf}</p></div><div className="overview-list">{prayerMeta.map((prayer) => <div className="overview-item" key={prayer.key}><div><span className="arabic">{prayer.arabic}</span><strong>{t.prayerNames[prayer.key]}</strong></div><span className="figure">{counts[prayer.key]} <small>/ {targets[prayer.key]}</small></span></div>)}</div></div></div>; }
