import type { Axis, Locale } from "@/lib/data/types";

type Tri = readonly [ru: string, kk: string, en: string];
const IDX: Record<Locale, 0 | 1 | 2> = { ru: 0, kk: 1, en: 2 };

/**
 * Short human labels for every tag of `AXIS_TAGS`, per axis (the same tag can mean different
 * things on different axes, e.g. "money" as a fear vs. as a motive). Used to build the
 * "why similar" / "how it differs" lines of story matches and the fallback report.
 */
const LABELS: Record<Axis, Record<string, Tri>> = {
  start: {
    "small-town": ["небольшой город или село", "шағын қала не ауыл", "a small town or village"],
    "big-city": ["большой город", "үлкен қала", "a big city"],
    "low-income": ["немного денег в семье", "отбасы табысы шағын", "a low family income"],
    "family-pressure": ["ожидания семьи", "отбасының күтуі", "family expectations"],
    "first-generation": ["первый в семье с таким путём", "отбасында осы жолды бірінші таңдаған", "first in the family on this path"],
    "no-support": ["мало поддержки рядом", "жанында қолдау аз", "little support nearby"],
    "late-start": ["старт позже, чем у многих", "көпшіліктен кешірек бастау", "a later start than most"],
    "abroad-or-diaspora": ["жизнь за рубежом или в диаспоре", "шетелде не диаспорада өмір", "life abroad or in a diaspora"],
  },
  interests: {
    tech: ["технологии", "технологиялар", "technology"],
    people: ["люди и общение", "адамдар мен қарым-қатынас", "people"],
    creative: ["творчество", "шығармашылық", "creative work"],
    science: ["наука", "ғылым", "science"],
    business: ["бизнес", "бизнес", "business"],
    "law-politics": ["право и политика", "құқық және саясат", "law and politics"],
    health: ["здоровье и медицина", "денсаулық және медицина", "health"],
    education: ["образование", "білім беру", "education"],
    sport: ["спорт", "спорт", "sport"],
    nature: ["природа и экология", "табиғат және экология", "nature"],
    "languages-culture": ["языки и культуры", "тілдер мен мәдениеттер", "languages and cultures"],
    "social-impact": ["польза обществу", "қоғамға пайда", "social impact"],
  },
  fears: {
    "wrong-choice": ["страх ошибиться с выбором", "қате таңдаудан қорқу", "fear of choosing wrong"],
    "disappointing-parents": ["страх разочаровать родителей", "ата-ананы ренжітуден қорқу", "fear of disappointing parents"],
    money: ["тревога из-за денег", "ақшаға қатысты алаң", "worry about money"],
    failure: ["страх неудачи", "сәтсіздіктен қорқу", "fear of failure"],
    "too-late": ["ощущение «уже поздно»", "«кеш болды» деген сезім", "feeling it is too late"],
    "not-talented-enough": ["сомнение в своих способностях", "өз қабілетіне күмән", "doubting your abilities"],
    "unknown-future": ["неясность впереди", "алдағының белгісіздігі", "an unclear future"],
    judgement: ["страх чужой оценки", "өзгенің бағасынан қорқу", "fear of being judged"],
  },
  education: {
    school: ["школа", "мектеп", "school"],
    university: ["университет", "университет", "university"],
    "changed-major": ["смена специальности", "мамандықты ауыстыру", "a change of major"],
    "dropped-out": ["уход из вуза", "оқуды тастау", "leaving university"],
    "self-taught": ["самообразование", "өздігінен оқу", "self-teaching"],
    "abroad-study": ["учёба за рубежом", "шетелде оқу", "study abroad"],
    vocational: ["колледж", "колледж", "college"],
    "no-relevant-education": ["образование не по теме", "тақырыпқа сай емес білім", "education in another field"],
  },
  challenges: {
    money: ["деньги", "ақша", "money"],
    language: ["языковой барьер", "тіл кедергісі", "language"],
    family: ["семейные обстоятельства", "отбасылық жағдай", "family circumstances"],
    information: ["нехватка информации", "ақпараттың жетіспеуі", "lack of information"],
    confidence: ["неуверенность в себе", "өзіне сенімсіздік", "self-doubt"],
    burnout: ["выгорание", "күйіп қалу", "burnout"],
    time: ["нехватка времени", "уақыт тапшылығы", "lack of time"],
    location: ["привязка к месту", "бір жерге байланыс", "being tied to a place"],
  },
  motives: {
    impact: ["польза людям", "адамдарға пайда", "helping people"],
    money: ["заработок", "табыс", "income"],
    freedom: ["свобода", "еркіндік", "freedom"],
    stability: ["стабильность", "тұрақтылық", "stability"],
    curiosity: ["любопытство и развитие", "қызығушылық пен даму", "curiosity and growth"],
    recognition: ["признание", "мойындалу", "recognition"],
    family: ["семья", "отбасы", "family"],
    belonging: ["своё сообщество", "өз ортасы", "belonging"],
  },
  decisions: {
    experiments: ["пробовать и экспериментировать", "сынап көру", "trying things out"],
    mentor: ["помощь наставника", "тәлімгер көмегі", "a mentor"],
    volunteering: ["волонтёрство", "еріктілік", "volunteering"],
    "switch-major": ["смена специальности", "мамандықты ауыстыру", "switching majors"],
    "take-a-break": ["пауза", "үзіліс", "taking a break"],
    "move-abroad": ["переезд в другую страну", "басқа елге көшу", "moving abroad"],
    "side-project": ["свой проект", "өз жобасы", "a side project"],
    "follow-parents": ["путь, выбранный родителями", "ата-ана таңдаған жол", "the path parents chose"],
    "gradual-change": ["постепенная смена пути", "жолды біртіндеп өзгерту", "a gradual change"],
  },
  transitions: {
    "school-to-university": ["из школы в вуз", "мектептен университетке", "school to university"],
    "major-change": ["смена специальности", "мамандықты ауыстыру", "a change of major"],
    "university-to-work": ["из вуза в работу", "университеттен жұмысқа", "university to work"],
    "career-change": ["смена профессии", "кәсіпті ауыстыру", "a career change"],
    relocation: ["переезд", "көшу", "relocation"],
    "gap-year": ["пауза в учёбе", "оқудағы үзіліс", "a gap year"],
    "late-career-change": ["смена профессии во взрослом возрасте", "ересек жаста кәсіп ауыстыру", "a later-life career change"],
    "side-to-main": ["хобби стало работой", "хобби жұмысқа айналды", "a side interest becoming the main one"],
  },
};

export function tagLabel(axis: Axis, tag: string, locale: Locale): string {
  return LABELS[axis][tag]?.[IDX[locale]] ?? tag;
}

/** Prefixes for "why similar" lines, per axis. */
export const AXIS_WHY: Record<Axis, Tri> = {
  start: ["Похожие стартовые условия", "Ұқсас бастапқы жағдай", "Similar starting point"],
  challenges: ["Похожие трудности", "Ұқсас қиындықтар", "Similar difficulties"],
  fears: ["Похожие страхи", "Ұқсас қорқыныштар", "Similar fears"],
  transitions: ["Похожий переход", "Ұқсас өтпелі кезең", "A similar transition"],
  education: ["Похожий путь в учёбе", "Ұқсас оқу жолы", "A similar education path"],
  interests: ["Общие интересы", "Ортақ қызығушылықтар", "Shared interests"],
  motives: ["Похожие мотивы", "Ұқсас уәждер", "Similar motives"],
  decisions: ["Похожие шаги", "Ұқсас қадамдар", "Similar steps"],
};

/** Prefixes for "how it differs" lines, per axis. */
export const AXIS_DIFF: Record<Axis, Tri> = {
  start: ["Другой старт в истории", "Әңгімедегі бастау басқа", "A different start in the story"],
  challenges: ["Другие трудности", "Басқа қиындықтар", "Different difficulties"],
  fears: ["Другие страхи", "Басқа қорқыныштар", "Different fears"],
  transitions: ["Другой переход", "Басқа өтпелі кезең", "A different transition"],
  education: ["Другой путь в учёбе", "Басқа оқу жолы", "A different education path"],
  interests: ["Другие интересы", "Басқа қызығушылықтар", "Different interests"],
  motives: ["Другие мотивы", "Басқа уәждер", "Different motives"],
  decisions: ["Другие шаги", "Басқа қадамдар", "Different steps"],
};

export function tri(t: Tri, locale: Locale): string {
  return t[IDX[locale]];
}
