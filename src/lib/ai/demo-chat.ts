/**
 * The demo-mode chat (no AI key): a rule-based guide that recognises the common topics of «Давай разберёмся»
 * in ru / kk / en, and answers in the interface language with support, a few ideas, a matching experiment
 * and story from the platform's own content, and one question back. It never invents content: stories and
 * experiments come only from src/content, demo stories are named as fictional, and every reply says it is
 * the demo mode.
 */
import experimentsJson from "@/content/experiments.json";
import storiesJson from "@/content/stories.json";
import { pickText } from "@/lib/data/content-utils";
import { DIRECTION_LABELS, DIRECTIONS, type DirectionSlug } from "@/lib/data/directions";
import type { Locale, StoryText } from "@/lib/data/types";
import type { ChatMessage } from "./types";

export const DEMO_TOPICS = [
  "crisis",
  "parents",
  "abroad",
  "money",
  "hateMajor",
  "late",
  "comparison",
  "noTalent",
  "tooMany",
  "fear",
  "tired",
  "unknown",
  "direction",
  "thanks",
  "greeting",
  "general",
] as const;
export type DemoTopic = (typeof DEMO_TOPICS)[number];

interface ExperimentLite {
  id: string;
  direction: string;
  title: Record<Locale, string>;
}
interface StoryLite {
  id: string;
  kind: string;
  lang: Locale;
  title: StoryText;
}
const EXPERIMENTS = experimentsJson as ExperimentLite[];
const STORIES = storiesJson as StoryLite[];

// ---------- recognising the topic ----------

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/[’`]/g, "'");
}

/** Stems match at the start of a word ("родител" matches «родители»); phrases with a space match anywhere. */
function matcher(stems: string[]): (text: string) => boolean {
  const escaped = stems.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})`, "u");
  return (text) => re.test(text);
}

const TOPIC_MATCHERS: Partial<Record<DemoTopic, (text: string) => boolean>> = {
  crisis: matcher([
    "не хочу жить", "не хочется жить", "покончить с собой", "покончу с собой", "суицид", "самоубий", "убить себя", "убью себя",
    "нет смысла жить", "хочу умереть", "өзімді өлтір", "өмір сүргім келмейді", "өлгім келеді",
    "kill myself", "suicid", "end my life", "want to die", "self-harm", "self harm",
  ]),
  parents: matcher([
    "родител", "мама", "маме", "мамой", "мать", "папа", "папе", "папой", "отец", "отца", "семья", "семье", "семьи", "родные",
    "ата-ана", "ата ана", "анам", "әкем", "отбас",
    "parent", "mom", "mum", "mother", "dad", "father", "family",
  ]),
  abroad: matcher([
    "за границ", "заграниц", "за рубеж", "зарубеж", "европ", "уехать учиться", "учиться в другой стране", "магистратур",
    "шетел", "abroad", "europe", "overseas", "master's", "masters",
  ]),
  money: matcher([
    "денег", "деньги", "деньгах", "дорого", "платн", "оплат", "стипенди", "грант", "бюджет",
    "ақша", "қымбат", "грант", "money", "afford", "expensive", "scholarship", "tuition",
  ]),
  hateMajor: matcher([
    "ненавиж", "не нравится специальн", "не нравится учеб", "не нравится мой факультет", "сменить специальн", "поменять специальн",
    "сменить професс", "поменять професс", "не по специальн", "не та специальн", "не своей специальн",
    "мамандығым ұнамайды", "мамандығымды ауыстыр", "hate my", "change my major", "switch my major", "wrong major", "change careers", "career change",
  ]),
  late: matcher([
    "поздно", "в моем возрасте", "уже за 30", "уже 30", "уже 25", "уже 40", "тым кеш", "кеш болды", "кеш емес пе",
    "too late", "too old", "at my age",
  ]),
  comparison: matcher([
    "кроме меня", "все продвига", "у всех получается", "отстаю", "сравнива", "все вокруг", "басқалар", "артта қал",
    "except me", "everyone is", "everyone else", "falling behind", "compare myself",
  ]),
  noTalent: matcher([
    "нет талант", "нет способност", "ничего не умею", "ни к чему не способ", "бездар", "ни в чем не хорош",
    "талантым жоқ", "ештеңе істей алмаймын", "no talent", "any talents", "not good at anything", "good at nothing",
  ]),
  tooMany: matcher([
    "много интерес", "все интересно", "всё интересно", "не могу выбрать", "трудно выбрать", "сложно выбрать",
    "қызығушылығым көп", "көп нәрсе қызық", "таңдай алмаймын", "too many interests", "can't choose", "cannot choose", "can't decide",
  ]),
  fear: matcher([
    "страшно", "боюсь", "страх", "ошибиться", "ошибку", "тревож", "қорқ", "afraid", "scared", "fear", "anxious", "mistake",
  ]),
  tired: matcher([
    "нет сил", "устал", "лень", "ленюсь", "мотивац", "выгор", "апати", "ничего не хочется", "шаршад", "жалқау", "күшім жоқ",
    "tired", "lazy", "motivation", "burn out", "burnt out", "burned out", "no energy",
  ]),
  unknown: matcher([
    "не знаю чего", "не знаю, чего", "не знаю кем", "не знаю, кем", "не знаю куда", "не знаю, куда", "не понимаю, чего",
    "не понимаю чего", "что мне делать", "что делать", "запутал", "білмеймін", "don't know what", "dont know what",
    "do not know what", "no idea", "feel lost", "i'm lost",
  ]),
  thanks: matcher(["спасибо", "благодар", "рахмет", "thank"]),
  greeting: matcher(["привет", "здравств", "салам", "сәлем", "добрый день", "добрый вечер", "hello", "hi", "hey"]),
};

const DIRECTION_MATCHERS: Record<DirectionSlug, (text: string) => boolean> = {
  diplomacy: matcher(["дипломат", "международн", "халықаралық", "diplomat", "international relations"]),
  entrepreneurship: matcher(["бизнес", "стартап", "предпринимат", "свое дело", "своё дело", "кәсіп", "business", "startup", "entrepreneur"]),
  psychology: matcher(["психолог", "psycholog"]),
  programming: matcher(["программ", "разработ", "айти", "кодить", "код ", "бағдарлам", "programm", "coding", "developer", "software"]),
  design: matcher(["дизайн", "рисова", "фигм", "figma", "design"]),
  education: matcher(["учител", "преподава", "педагог", "мұғалім", "teacher", "teaching"]),
  media: matcher(["журналист", "блог", "медиа", "видео", "журналис", "journalis", "media", "blog"]),
  research: matcher(["наук", "ученым", "ученый", "исследова", "ғылым", "science", "scientist", "research"]),
  "social-impact": matcher(["волонт", "социальн", "ерікті", "volunteer", "social impact", "nonprofit"]),
  medicine: matcher(["врач", "медиц", "медсест", "дәрігер", "doctor", "medic", "nurse"]),
  law: matcher(["юрист", "юриспруд", "адвокат", "заңгер", "lawyer", "law school", "legal"]),
  engineering: matcher(["инженер", "engineer"]),
  "data-ml": matcher(["машинн", "нейросет", "данных", "дата", "ии", "искусственн", "жасанды интеллект", "data", "machine learning", "ml", "ai"]),
  environment: matcher(["эколог", "климат", "climate", "environment", "ecology"]),
};

/** The first direction mentioned in the text, or null. */
export function detectDirection(text: string): DirectionSlug | null {
  const t = normalize(text);
  return DIRECTIONS.find((d) => DIRECTION_MATCHERS[d](t)) ?? null;
}

/** The main topic of one message, by priority (a crisis always wins). */
export function detectTopic(text: string): DemoTopic {
  const t = normalize(text);
  const short = t.split(/\s+/).filter(Boolean).length <= 4;
  for (const topic of DEMO_TOPICS) {
    if (topic === "direction") {
      if (detectDirection(t)) return "direction";
      continue;
    }
    if ((topic === "greeting" || topic === "thanks") && !short) continue;
    if (TOPIC_MATCHERS[topic]?.(t)) return topic;
  }
  return "general";
}

// ---------- what the guide says ----------

interface TopicCopy {
  open: string[];
  ideas: string[];
  ask: string[];
}
type Copy = Record<Exclude<DemoTopic, "crisis">, TopicCopy>;

interface Shared {
  crisis: string;
  ideasLead: string;
  story: (title: string, href: string) => string;
  experiment: (title: string, href: string) => string;
  direction: (label: string) => string;
  explore: (href: string) => string;
  opportunities: (href: string) => string;
  note: string;
}

const SHARED: Record<Locale, Shared> = {
  ru: {
    crisis:
      "Мне очень жаль, что тебе сейчас так тяжело. Ты не обязан(а) справляться с этим в одиночку.\n\n" +
      "Пожалуйста, прямо сейчас поговори с человеком, которому доверяешь, или позвони на бесплатный телефон доверия для детей и молодёжи **150** (Казахстан). Если есть опасность для жизни, звони **112**.\n\n" +
      "Разговор об учёбе и профессии подождёт. Сейчас важнее всего ты.",
    ideasLead: "Что можно сделать:",
    story: (title, href) => `Почитай историю **«${title}»** (реальная история по материалам СМИ, со ссылкой на источник): [открыть историю →](${href})`,
    experiment: (title, href) => `Маленькая проба на сайте: **«${title}»**. [Все пробы →](${href})`,
    direction: (label) => `Ты упомянул(а) направление **«${label}»**. Лучший способ понять, твоё ли это, — попробовать на маленьком задании.`,
    explore: (href) => `Если хочешь посмотреть на себя целиком, пройди анкету: она соберёт отчёт с направлениями и планом. [Пройти анкету →](${href})`,
    opportunities: (href) => `Стипендии и программы собраны на сайте (условия всегда сверяй на официальном сайте): [смотреть возможности →](${href})`,
    note: "Демо‑режим: я отвечаю по готовым подсказкам, без настоящего ИИ. Когда ИИ подключат, ответы станут точнее.",
  },
  kk: {
    crisis:
      "Қазір саған осыншалық ауыр болғанына қатты өкінемін. Мұнымен жалғыз күресудің қажеті жоқ.\n\n" +
      "Өтінемін, дәл қазір өзің сенетін адаммен сөйлес немесе балалар мен жастарға арналған тегін сенім телефонына **150** (Қазақстан) қоңырау шал. Өмірге қауіп болса, **112** нөміріне хабарлас.\n\n" +
      "Оқу мен мамандық туралы әңгіме күте тұрады. Қазір ең маңыздысы — сен.",
    ideasLead: "Не істеуге болады:",
    story: (title, href) => `Мына әңгімені оқып көр: **«${title}»** (БАҚ материалдары бойынша нақты оқиға, дереккөзі көрсетілген): [әңгімені ашу →](${href})`,
    experiment: (title, href) => `Сайттағы шағын тәжірибе: **«${title}»**. [Барлық тәжірибелер →](${href})`,
    direction: (label) => `Сен **«${label}»** бағытын атадың. Бұл саған сай ма, соны түсінудің ең жақсы жолы — шағын тапсырмада байқап көру.`,
    explore: (href) => `Өзіңді толық көргің келсе, сауалнамадан өт: ол бағыттар мен жоспары бар есеп жасайды. [Сауалнамадан өту →](${href})`,
    opportunities: (href) => `Стипендиялар мен бағдарламалар сайтта жиналған (шарттарын әрқашан ресми сайттан тексер): [мүмкіндіктерді көру →](${href})`,
    note: "Демо режим: мен нағыз ЖИ-сіз, дайын кеңестер бойынша жауап беремін. ЖИ қосылғанда жауаптар дәлірек болады.",
  },
  en: {
    crisis:
      "I'm really sorry it feels this hard right now. You don't have to deal with it alone.\n\n" +
      "Please talk to someone you trust right now, or call the free helpline for children and young people **150** (Kazakhstan). If your life is in danger, call **112**.\n\n" +
      "Study and career questions can wait. Right now, you matter most.",
    ideasLead: "What could help:",
    story: (title, href) => `Read the story **“${title}”** (a real story retold from the media, with a link to the source): [open the story →](${href})`,
    experiment: (title, href) => `A small experiment on the site: **“${title}”**. [All experiments →](${href})`,
    direction: (label) => `You mentioned **“${label}”**. The best way to see whether it fits you is to try it on a small task.`,
    explore: (href) => `If you want to look at the whole picture, take the questionnaire: it builds a report with directions and a plan. [Take the questionnaire →](${href})`,
    opportunities: (href) => `Scholarships and programmes are collected on the site (always check the conditions on the official site): [see opportunities →](${href})`,
    note: "Demo mode: I'm answering from prepared guidance, without real AI. Once AI is connected, answers will be more precise.",
  },
};

const COPY: Record<Locale, Copy> = {
  ru: {
    parents: {
      open: [
        "Когда родители хотят для тебя одного, а тебя тянет к другому, это очень тяжело. Обычно они хотят тебе добра, просто видят его по‑своему.",
        "Понимаю. Спорить с близкими сложнее, чем с кем‑то чужим, потому что их мнение для тебя важно.",
      ],
      ideas: [
        "Спроси родителей, чего именно они боятся: денег, стабильности, мнения других. Часто за «стань врачом» стоит страх, а не сама профессия.",
        "Покажи не спор, а план: что ты хочешь попробовать, как проверишь и когда вы вместе посмотрите на результат.",
        "Попробуй и их вариант на маленьком задании. Так у тебя будет свой опыт, а не только чужое мнение.",
      ],
      ask: [
        "А чего хочется тебе самому (самой), если на минуту забыть про ожидания родителей?",
        "Как думаешь, что для твоих родителей самое важное в твоём будущем?",
      ],
    },
    abroad: {
      open: [
        "Учёба за границей — реальная цель, даже если сейчас непонятно, с какой стороны к ней подойти.",
        "Хорошая цель. Она кажется огромной, но раскладывается на понятные шаги.",
      ],
      ideas: [
        "Сначала реши, что именно учить (направление), а уже потом выбирай страну и университет.",
        "Посмотри, какой уровень языка нужен (часто IELTS или TOEFL), и начни готовиться заранее: это самый долгий шаг.",
        "Выпиши 3–5 программ и их требования в одну таблицу: документы, сроки, стоимость, стипендии.",
      ],
      ask: [
        "Ты уже знаешь, какое направление хочешь изучать за границей?",
        "Что сейчас кажется самым сложным: язык, деньги, документы или выбор страны?",
      ],
    },
    money: {
      open: [
        "Деньги — честная и важная причина задуматься. Но это ограничение, а не приговор твоим планам.",
        "Понимаю, финансовый вопрос часто решает больше, чем хотелось бы.",
      ],
      ideas: [
        "Есть гранты и стипендии: государственные, университетские и от фондов. Многие покрывают учёбу полностью.",
        "Начать можно с бесплатного: онлайн‑курсы, открытые лекции, волонтёрство. Так ты проверишь интерес, ничего не тратя.",
        "Можно идти постепенно: работа и учёба частями тоже нормальный путь.",
      ],
      ask: [
        "Деньги нужны на учёбу, на переезд или на то, чтобы просто попробовать что‑то новое?",
        "Если бы деньги не были вопросом, что бы ты выбрал(а)?",
      ],
    },
    hateMajor: {
      open: [
        "Учиться тому, что не нравится, выматывает. Хорошо, что ты это замечаешь, а не терпишь молча.",
        "Это частая ситуация, и из неё есть выходы. Первая специальность не обязана быть последней.",
      ],
      ideas: [
        "Раздели: тебе не нравится сама сфера, предметы, преподаватели или атмосфера? От ответа зависит, что менять.",
        "Найди в своей специальности хотя бы одну часть, которая интересна. Иногда с неё начинается новое направление.",
        "Попробуй другую сферу на маленьком задании, прежде чем бросать или переводиться.",
      ],
      ask: [
        "Что именно в специальности тебе не нравится больше всего?",
        "Если бы можно было выбрать заново, к чему бы ты присмотрелся (присмотрелась)?",
      ],
    },
    late: {
      open: [
        "Мысль «уже поздно» приходит почти ко всем, и в 20, и в 40 лет. Но поздно бывает гораздо реже, чем кажется.",
        "Понимаю этот страх. Только твой опыт никуда не исчезает: он помогает и в новом деле.",
      ],
      ideas: [
        "Посмотри, какие навыки из прошлого опыта можно взять с собой: общение, ответственность, знания сферы.",
        "Начни не с большого решения, а с пробы на пару часов в неделю.",
        "Найди людей, которые сменили путь в твоём возрасте, и спроси, как это было.",
      ],
      ask: [
        "Что бы ты попробовал(а), если бы точно знал(а), что ещё не поздно?",
        "Какой навык из твоего опыта, по‑твоему, пригодится и в новом деле?",
      ],
    },
    comparison: {
      open: [
        "Когда кажется, что все вокруг продвигаются, а ты стоишь на месте, это очень давит.",
        "Это чувство знакомо многим. Соцсети показывают чужие успехи, но не их сомнения.",
      ],
      ideas: [
        "Сравнивай себя с собой полгода назад, а не с другими. Что ты уже умеешь из того, чего не умел(а) тогда?",
        "У всех разный старт и разная скорость. Чужой путь не мерка для твоего.",
        "Выбери один маленький шаг на эту неделю. Движение снимает ощущение застоя лучше любых мыслей.",
      ],
      ask: [
        "С кем ты чаще всего себя сравниваешь и в чём именно?",
        "Какой маленький шаг ты мог(ла) бы сделать уже на этой неделе?",
      ],
    },
    noTalent: {
      open: [
        "Мысль «у меня нет талантов» обычно появляется не от их отсутствия, а от того, что свои сильные стороны трудно заметить.",
        "Понимаю. Чаще всего это значит, что ты ещё не попробовал(а) достаточно разных вещей.",
      ],
      ideas: [
        "Спроси 3 друзей, за чем ты обычно к ним приходишь или в чём им помогаешь. Ответы часто удивляют.",
        "Вспомни, за каким делом ты теряешь счёт времени. Это подсказка, даже если дело кажется несерьёзным.",
        "Талант часто вырастает из интереса и практики. Начни с интереса.",
      ],
      ask: [
        "Чем ты занимаешься, когда никто не заставляет?",
        "За что тебя чаще всего благодарят друзья или близкие?",
      ],
    },
    tooMany: {
      open: [
        "Много интересов — это не проблема, а большой выбор. Сложность только в том, с чего начать.",
        "Понимаю, когда интересно всё, страшно выбрать одно и потерять остальное.",
      ],
      ideas: [
        "Тебе не нужно выбирать навсегда. Выбери, что проверить первым.",
        "Сделай по маленькой пробе в 2–3 интересах и сравни, после чего у тебя было больше энергии.",
        "Поищи, где интересы пересекаются: часто самые интересные пути лежат на стыке.",
      ],
      ask: [
        "Какие 2–3 интереса сейчас для тебя самые сильные?",
        "Если бы надо было попробовать что‑то одно уже на этой неделе, что бы это было?",
      ],
    },
    fear: {
      open: [
        "Страшно — это нормально. Обычно это значит, что для тебя это важно.",
        "Понимаю. Страх ошибиться бывает сильнее самого желания попробовать.",
      ],
      ideas: [
        "Сделай шаг настолько маленьким, чтобы ошибка ничего не стоила: пара часов, один разговор, одно задание.",
        "Подумай, что самое плохое может случиться и как ты бы с этим справился (справилась). Обычно это переживаемо.",
        "Проба — это не решение на всю жизнь, а просто сбор информации о себе.",
      ],
      ask: [
        "Чего именно ты боишься больше всего, если назвать это одним предложением?",
        "Какой самый маленький шаг ты бы решился (решилась) сделать?",
      ],
    },
    tired: {
      open: [
        "Когда нет сил, любые планы кажутся тяжёлыми. Это не лень и не слабость, а сигнал, что ресурса мало.",
        "Понимаю. Без энергии трудно думать о будущем, и это нормально.",
      ],
      ideas: [
        "Сначала базовое: сон, еда, отдых, немного движения. Без этого мотивация не появится.",
        "Возьми совсем маленькую цель, на 15 минут. Сделанное маленькое дело даёт больше сил, чем большой план.",
        "Если усталость тянется неделями, стоит поговорить с близким человеком или специалистом.",
      ],
      ask: [
        "Как давно ты чувствуешь такую усталость?",
        "Что раньше давало тебе энергию?",
      ],
    },
    unknown: {
      open: [
        "Не знать, чего хочешь, — нормально. Так бывает у очень многих, и в 16, и в 30 лет.",
        "Понимаю. Ответ обычно не приходит сам, его находят через пробы.",
      ],
      ideas: [
        "Не пытайся сразу найти «дело всей жизни». Начни с того, что тебе хотя бы чуть‑чуть интересно.",
        "Попробуй 2–3 маленьких эксперимента в разных сферах и замечай, после чего было больше энергии.",
        "Запиши, что тебе точно не нравится. Это тоже сужает выбор.",
      ],
      ask: [
        "Было ли что‑то, что тебе нравилось делать раньше, хотя бы немного?",
        "Чем бы ты занялся (занялась), если бы никто не оценивал результат?",
      ],
    },
    direction: {
      open: ["Здорово, что у тебя есть интерес. С ним уже можно работать.", "Хорошая точка старта."],
      ideas: [
        "Узнай, как выглядит обычный рабочий день в этой сфере. Он часто отличается от картинки в фильмах.",
        "Найди человека, который уже этим занимается, и задай ему 3–5 вопросов.",
        "Сделай маленькое задание из этой сферы и посмотри, захочется ли продолжить.",
      ],
      ask: [
        "Что именно тебя привлекает в этом направлении?",
        "Ты уже пробовал(а) что‑то из этой сферы на практике?",
      ],
    },
    thanks: {
      open: ["Пожалуйста! Рад(а), если это было полезно.", "Всегда пожалуйста."],
      ideas: [],
      ask: ["Хочешь разобрать что‑то ещё?", "Есть ещё что‑то, о чём хочется подумать?"],
    },
    greeting: {
      open: [
        "Привет! Я помощник THE BRIDGE. Помогаю спокойно разобраться с учёбой, профессией и сомнениями.",
        "Привет! Рад(а) тебя видеть.",
      ],
      ideas: [],
      ask: [
        "Расскажи, что тебя сейчас волнует: выбор профессии, учёба, родители, страх ошибиться или что‑то ещё?",
        "О чём хочешь поговорить сегодня?",
      ],
    },
    general: {
      open: [
        "Спасибо, что поделился (поделилась). Давай разберёмся вместе.",
        "Понимаю. Чтобы подсказать точнее, мне нужно чуть больше деталей.",
      ],
      ideas: [
        "Попробуй описать ситуацию в 2–3 предложениях: что происходит и что тебя беспокоит.",
        "Можно начать с анкеты: она поможет увидеть свои интересы и сильные стороны.",
      ],
      ask: [
        "Что для тебя сейчас самое важное в этом вопросе?",
        "Это больше про выбор профессии, про учёбу или про что‑то другое?",
      ],
    },
  },
  kk: {
    parents: {
      open: [
        "Ата-анаң сен үшін бір нәрсені қалап, ал сені басқа нәрсе тартса, бұл өте қиын. Әдетте олар саған жақсылық тілейді, тек оны өзінше көреді.",
        "Түсінемін. Жақын адамдармен келіспеу бөтен адаммен келіспеуден қиынырақ, себебі олардың пікірі саған маңызды.",
      ],
      ideas: [
        "Ата-анаңнан нақты неден қорқатынын сұра: ақшадан ба, тұрақтылықтан ба, басқалардың пікірінен бе. Көбіне «дәрігер бол» дегеннің артында мамандықтың өзі емес, қорқыныш тұрады.",
        "Дау емес, жоспар көрсет: нені байқап көргің келеді, қалай тексересің және нәтижені қашан бірге қарайсыңдар.",
        "Олардың нұсқасын да шағын тапсырмада байқап көр. Сонда сенде бөтен пікір ғана емес, өз тәжірибең болады.",
      ],
      ask: [
        "Ата-анаңның күтуін бір минутқа ұмытсаң, өзің не қалайсың?",
        "Сенің ойыңша, ата-анаң үшін сенің болашағыңда ең маңыздысы не?",
      ],
    },
    abroad: {
      open: [
        "Шетелде оқу — қазір оған қай жағынан келуді білмесең де, нақты мақсат.",
        "Жақсы мақсат. Ол үлкен болып көрінеді, бірақ түсінікті қадамдарға бөлінеді.",
      ],
      ideas: [
        "Алдымен нені оқитыныңды (бағытты) шеш, содан кейін ел мен университетті таңда.",
        "Тілді қай деңгейде білу керек екенін қара (көбіне IELTS не TOEFL) және ертерек дайындал: бұл ең ұзақ қадам.",
        "3–5 бағдарламаны және олардың талаптарын бір кестеге жаз: құжаттар, мерзімдер, құны, стипендиялар.",
      ],
      ask: [
        "Шетелде қай бағытты оқығың келетінін білесің бе?",
        "Қазір ең қиыны не болып көрінеді: тіл, ақша, құжаттар ма, әлде ел таңдау ма?",
      ],
    },
    money: {
      open: [
        "Ақша — ойлануға адал әрі маңызды себеп. Бірақ бұл шектеу ғана, жоспарларыңа үкім емес.",
        "Түсінемін, қаржы мәселесі көбіне біз қалағаннан да көп нәрсені шешеді.",
      ],
      ideas: [
        "Гранттар мен стипендиялар бар: мемлекеттік, университеттік және қорлардан. Көбі оқуды толық жабады.",
        "Тегін нәрседен бастауға болады: онлайн курстар, ашық дәрістер, волонтерлік. Ақша жұмсамай-ақ қызығушылығыңды тексересің.",
        "Біртіндеп жүруге болады: жұмыс пен оқуды бөліп жүргізу де қалыпты жол.",
      ],
      ask: [
        "Ақша оқуға ма, көшуге ме, әлде жаңа нәрсені жай байқап көруге ме керек?",
        "Ақша мәселе болмаса, не таңдар едің?",
      ],
    },
    hateMajor: {
      open: [
        "Ұнамайтын нәрсені оқу шаршатады. Үндемей шыдамай, мұны байқағаның жақсы.",
        "Бұл жиі кездесетін жағдай және одан шығу жолдары бар. Алғашқы мамандық соңғысы болуға міндетті емес.",
      ],
      ideas: [
        "Бөліп қара: саған саланың өзі ұнамай ма, пәндер ме, оқытушылар ма, әлде орта ма? Нені өзгерту керек екені соған байланысты.",
        "Мамандығыңнан ең болмаса бір қызық бөлікті тап. Кейде жаңа бағыт содан басталады.",
        "Тастамас немесе ауыспас бұрын басқа саланы шағын тапсырмада байқап көр.",
      ],
      ask: [
        "Мамандығыңда саған ең ұнамайтыны не?",
        "Қайтадан таңдауға мүмкіндік болса, неге назар аударар едің?",
      ],
    },
    late: {
      open: [
        "«Тым кеш» деген ой 20-да да, 40-та да көп адамға келеді. Бірақ шын мәнінде кеш болу көрінгеннен әлдеқайда сирек.",
        "Бұл қорқынышты түсінемін. Тек сенің тәжірибең ешқайда жоғалмайды: ол жаңа істе де көмектеседі.",
      ],
      ideas: [
        "Бұрынғы тәжірибеңнен қандай дағдыларды ала алатыныңды қара: қарым-қатынас, жауапкершілік, сала туралы білім.",
        "Үлкен шешімнен емес, аптасына бір-екі сағаттық сынақтан баста.",
        "Сенің жасыңда жолын өзгерткен адамдарды тауып, қалай болғанын сұра.",
      ],
      ask: [
        "Әлі кеш емес екенін нақты білсең, нені байқап көрер едің?",
        "Сенің ойыңша, тәжірибеңнен қай дағды жаңа істе де пайдалы болады?",
      ],
    },
    comparison: {
      open: [
        "Айналаңдағылардың бәрі алға жылжып, сен бір орында тұрғандай көрінгенде, бұл қатты қысым жасайды.",
        "Бұл сезім көпке таныс. Әлеуметтік желілер басқалардың жетістігін көрсетеді, бірақ күдіктерін көрсетпейді.",
      ],
      ideas: [
        "Өзіңді басқалармен емес, жарты жыл бұрынғы өзіңмен салыстыр. Сол кезде білмеген нені қазір білесің?",
        "Әркімнің бастауы да, жылдамдығы да әртүрлі. Бөтен жол сенің жолыңның өлшемі емес.",
        "Осы аптаға бір кішкентай қадам таңда. Қозғалыс тұрып қалу сезімін кез келген ойдан жақсы басады.",
      ],
      ask: [
        "Өзіңді кіммен және нақты неде жиі салыстырасың?",
        "Осы аптада қандай кішкентай қадам жасай аласың?",
      ],
    },
    noTalent: {
      open: [
        "«Менің таланттарым жоқ» деген ой әдетте олардың жоқтығынан емес, өз күшті жақтарыңды байқау қиын болғандықтан пайда болады.",
        "Түсінемін. Көбіне бұл сенің әлі әртүрлі нәрселерді жеткілікті байқап көрмегеніңді білдіреді.",
      ],
      ideas: [
        "3 досыңнан әдетте не үшін саған келетінін немесе неде оларға көмектесетініңді сұра. Жауаптар жиі таң қалдырады.",
        "Қай іспен айналысқанда уақытты ұмытатыныңды есіңе түсір. Іс маңызсыз көрінсе де, бұл — белгі.",
        "Талант көбіне қызығушылық пен тәжірибеден өседі. Қызығушылықтан баста.",
      ],
      ask: [
        "Ешкім мәжбүрлемегенде немен айналысасың?",
        "Достарың не жақындарың саған жиі не үшін алғыс айтады?",
      ],
    },
    tooMany: {
      open: [
        "Қызығушылықтың көп болуы — мәселе емес, үлкен таңдау. Қиындық тек неден бастауда.",
        "Түсінемін, бәрі қызық болғанда біреуін таңдап, қалғанын жоғалтудан қорқасың.",
      ],
      ideas: [
        "Мәңгілікке таңдаудың қажеті жоқ. Алдымен нені тексеретініңді таңда.",
        "2–3 қызығушылығың бойынша шағын сынақ жасап, қайсысынан кейін көбірек күш болғанын салыстыр.",
        "Қызығушылықтарың қай жерде тоғысатынын ізде: ең қызық жолдар көбіне түйіскен жерде жатады.",
      ],
      ask: [
        "Қазір саған ең күшті 2–3 қызығушылық қайсы?",
        "Осы аптада бір ғана нәрсені байқап көру керек болса, ол не болар еді?",
      ],
    },
    fear: {
      open: [
        "Қорқу — қалыпты нәрсе. Әдетте бұл сен үшін маңызды екенін білдіреді.",
        "Түсінемін. Қателесуден қорқу кейде байқап көру тілегінен де күшті болады.",
      ],
      ideas: [
        "Қадамды қателік ештеңеге тұрмайтындай етіп кішірейт: бір-екі сағат, бір әңгіме, бір тапсырма.",
        "Ең жаман не болуы мүмкін және онымен қалай күресер едің, соны ойлан. Әдетте оны еңсеруге болады.",
        "Сынақ — өмір бойғы шешім емес, жай ғана өзің туралы ақпарат жинау.",
      ],
      ask: [
        "Бір сөйлеммен айтсаң, ең көп неден қорқасың?",
        "Қандай ең кішкентай қадамға батылың барар еді?",
      ],
    },
    tired: {
      open: [
        "Күш болмаған кезде кез келген жоспар ауыр көрінеді. Бұл жалқаулық та, әлсіздік те емес, ресурстың аз екенінің белгісі.",
        "Түсінемін. Күш жоқта болашақ туралы ойлау қиын, бұл қалыпты.",
      ],
      ideas: [
        "Алдымен негізгісі: ұйқы, тамақ, демалыс, аздап қозғалыс. Онсыз мотивация пайда болмайды.",
        "Мүлде кішкентай, 15 минуттық мақсат ал. Орындалған кішкентай іс үлкен жоспардан көбірек күш береді.",
        "Шаршау апталап созылса, жақын адаммен немесе маманмен сөйлескен жөн.",
      ],
      ask: [
        "Мұндай шаршауды қашаннан бері сезінесің?",
        "Бұрын саған не күш беретін еді?",
      ],
    },
    unknown: {
      open: [
        "Не қалайтыныңды білмеу — қалыпты нәрсе. Бұл 16-да да, 30-да да көп адамда болады.",
        "Түсінемін. Жауап әдетте өзі келмейді, оны сынақтар арқылы табады.",
      ],
      ideas: [
        "Бірден «өмірлік ісіңді» табуға тырыспа. Саған аздап болса да қызық нәрседен баста.",
        "Әртүрлі салада 2–3 шағын тәжірибе жасап көр және қайсысынан кейін көбірек күш болғанын байқа.",
        "Саған нақты ұнамайтын нәрселерді жаз. Бұл да таңдауды тарылтады.",
      ],
      ask: [
        "Бұрын аздап болса да істегенді ұнататын нәрсе болды ма?",
        "Нәтижеңді ешкім бағаламаса, немен айналысар едің?",
      ],
    },
    direction: {
      open: ["Қызығушылығың бар екені тамаша. Онымен жұмыс істеуге болады.", "Жақсы бастау нүктесі."],
      ideas: [
        "Бұл саладағы әдеттегі жұмыс күні қалай өтетінін біл. Ол көбіне фильмдегі суреттен өзгеше болады.",
        "Мұнымен айналысып жүрген адамды тауып, оған 3–5 сұрақ қой.",
        "Осы саладан шағын тапсырма орындап, жалғастырғың келетінін байқа.",
      ],
      ask: [
        "Бұл бағытта сені нақты не тартады?",
        "Бұл саладан бір нәрсені іс жүзінде байқап көрдің бе?",
      ],
    },
    thanks: {
      open: ["Оқасы жоқ! Пайдалы болса, қуаныштымын.", "Әрқашан көмектесуге дайынмын."],
      ideas: [],
      ask: ["Тағы бір нәрсені талқылағың келе ме?", "Ойланғың келетін тағы бірдеңе бар ма?"],
    },
    greeting: {
      open: [
        "Сәлем! Мен THE BRIDGE көмекшісімін. Оқу, мамандық және күдіктер туралы асықпай ойлануға көмектесемін.",
        "Сәлем! Сені көргеніме қуаныштымын.",
      ],
      ideas: [],
      ask: [
        "Қазір сені не мазалайды: мамандық таңдау, оқу, ата-ана, қателесуден қорқу ма, әлде басқа нәрсе ме?",
        "Бүгін не туралы сөйлескің келеді?",
      ],
    },
    general: {
      open: [
        "Бөліскеніңе рахмет. Бірге түсініп көрейік.",
        "Түсінемін. Нақтырақ кеңес беру үшін маған сәл көбірек мәлімет керек.",
      ],
      ideas: [
        "Жағдайды 2–3 сөйлеммен сипаттап көр: не болып жатыр және сені не алаңдатады.",
        "Сауалнамадан бастауға болады: ол қызығушылықтарың мен күшті жақтарыңды көруге көмектеседі.",
      ],
      ask: [
        "Бұл мәселеде қазір сен үшін ең маңыздысы не?",
        "Бұл көбіне мамандық таңдау туралы ма, оқу туралы ма, әлде басқа нәрсе ме?",
      ],
    },
  },
  en: {
    parents: {
      open: [
        "When your parents want one thing for you and you're drawn to another, it's really hard. Usually they want the best for you, they just see it their own way.",
        "I understand. Disagreeing with people close to you is harder than with strangers, because their opinion matters to you.",
      ],
      ideas: [
        "Ask your parents what exactly they're worried about: money, stability, what others think. Often “become a doctor” hides a fear, not the profession itself.",
        "Show a plan instead of an argument: what you want to try, how you'll test it, and when you'll look at the result together.",
        "Try their option on a small task too. Then you'll have your own experience, not just someone else's opinion.",
      ],
      ask: [
        "What do you want, if you set your parents' expectations aside for a minute?",
        "What do you think matters most to your parents about your future?",
      ],
    },
    abroad: {
      open: [
        "Studying abroad is a real goal, even if right now it's unclear where to start.",
        "Good goal. It looks huge, but it breaks down into clear steps.",
      ],
      ideas: [
        "First decide what to study (the direction), then choose the country and university.",
        "Check what language level you need (often IELTS or TOEFL) and start early: it's the longest step.",
        "Put 3–5 programmes and their requirements in one table: documents, deadlines, cost, scholarships.",
      ],
      ask: [
        "Do you already know which direction you'd like to study abroad?",
        "What feels hardest right now: language, money, documents or choosing a country?",
      ],
    },
    money: {
      open: [
        "Money is an honest, important reason to think twice. But it's a constraint, not a verdict on your plans.",
        "I understand, money often decides more than we'd like.",
      ],
      ideas: [
        "There are grants and scholarships: government, university and foundation ones. Many cover tuition fully.",
        "You can start with free things: online courses, open lectures, volunteering. That way you test your interest without spending anything.",
        "You can go step by step: working and studying in parts is a normal path too.",
      ],
      ask: [
        "Do you need money for studying, for moving, or just to try something new?",
        "If money weren't an issue, what would you choose?",
      ],
    },
    hateMajor: {
      open: [
        "Studying something you don't like is exhausting. It's good that you notice it instead of quietly putting up with it.",
        "This happens a lot, and there are ways out. Your first major doesn't have to be your last.",
      ],
      ideas: [
        "Separate it out: is it the field itself, the subjects, the teachers or the atmosphere? What to change depends on the answer.",
        "Find at least one part of your major that interests you. Sometimes a new direction starts there.",
        "Try another field on a small task before dropping out or transferring.",
      ],
      ask: [
        "What exactly do you dislike most about your major?",
        "If you could choose again, what would you look at?",
      ],
    },
    late: {
      open: [
        "The thought “it's too late” comes to almost everyone, at 20 and at 40. But it's too late far less often than it seems.",
        "I understand that fear. Your experience doesn't disappear, though: it helps in something new too.",
      ],
      ideas: [
        "Look at which skills from your past you can take with you: communication, responsibility, knowledge of a field.",
        "Start with a trial of a couple of hours a week, not with a big decision.",
        "Find people who changed paths at your age and ask how it went.",
      ],
      ask: [
        "What would you try if you knew for sure it isn't too late?",
        "Which skill from your experience do you think would help in something new?",
      ],
    },
    comparison: {
      open: [
        "When it feels like everyone around you is moving forward and you're standing still, it's a lot of pressure.",
        "Many people know this feeling. Social media shows other people's wins, not their doubts.",
      ],
      ideas: [
        "Compare yourself with yourself six months ago, not with others. What can you do now that you couldn't then?",
        "Everyone has a different start and a different pace. Someone else's path isn't a measure of yours.",
        "Pick one small step for this week. Movement beats the feeling of being stuck better than any thinking.",
      ],
      ask: [
        "Who do you compare yourself with most, and in what exactly?",
        "What small step could you take this week?",
      ],
    },
    noTalent: {
      open: [
        "The thought “I have no talents” usually comes not from having none, but from how hard it is to notice your own strengths.",
        "I understand. Most often it means you haven't tried enough different things yet.",
      ],
      ideas: [
        "Ask 3 friends what they usually come to you for, or what you help them with. The answers often surprise.",
        "Remember what you lose track of time doing. That's a hint, even if it seems unserious.",
        "Talent often grows out of interest and practice. Start with interest.",
      ],
      ask: [
        "What do you do when nobody makes you?",
        "What do friends or family thank you for most often?",
      ],
    },
    tooMany: {
      open: [
        "Having many interests isn't a problem, it's a big choice. The only hard part is where to start.",
        "I understand, when everything is interesting it's scary to pick one and lose the rest.",
      ],
      ideas: [
        "You don't have to choose forever. Choose what to test first.",
        "Do a small trial in 2–3 of your interests and compare which one left you with more energy.",
        "Look for where your interests overlap: the most interesting paths often lie at the intersection.",
      ],
      ask: [
        "Which 2–3 interests feel strongest for you right now?",
        "If you had to try just one thing this week, what would it be?",
      ],
    },
    fear: {
      open: [
        "Being scared is normal. Usually it means this matters to you.",
        "I understand. The fear of making a mistake can be stronger than the wish to try.",
      ],
      ideas: [
        "Make the step so small that a mistake costs nothing: a couple of hours, one conversation, one task.",
        "Think about the worst that could happen and how you'd handle it. Usually it's survivable.",
        "A trial isn't a life decision, it's just collecting information about yourself.",
      ],
      ask: [
        "What exactly are you most afraid of, in one sentence?",
        "What's the smallest step you'd dare to take?",
      ],
    },
    tired: {
      open: [
        "When you have no energy, any plan feels heavy. It's not laziness or weakness, it's a sign your resources are low.",
        "I understand. Without energy it's hard to think about the future, and that's okay.",
      ],
      ideas: [
        "Basics first: sleep, food, rest, a bit of movement. Motivation won't show up without them.",
        "Take a tiny goal, 15 minutes. A small thing done gives more energy than a big plan.",
        "If the tiredness lasts for weeks, it's worth talking to someone close or a specialist.",
      ],
      ask: [
        "How long have you been feeling this tired?",
        "What used to give you energy?",
      ],
    },
    unknown: {
      open: [
        "Not knowing what you want is normal. It happens to lots of people, at 16 and at 30.",
        "I understand. The answer rarely arrives on its own, people find it by trying things.",
      ],
      ideas: [
        "Don't try to find your “life's work” right away. Start with something that interests you even a little.",
        "Try 2–3 small experiments in different fields and notice which one left you with more energy.",
        "Write down what you definitely don't like. That narrows the choice too.",
      ],
      ask: [
        "Was there something you enjoyed doing before, even a little?",
        "What would you do if nobody judged the result?",
      ],
    },
    direction: {
      open: ["It's great that you have an interest. That's something to work with.", "A good starting point."],
      ideas: [
        "Find out what an ordinary working day in this field looks like. It's often different from the picture in films.",
        "Find someone who already does this and ask them 3–5 questions.",
        "Do a small task from this field and see whether you want to continue.",
      ],
      ask: [
        "What exactly draws you to this direction?",
        "Have you tried anything from this field in practice yet?",
      ],
    },
    thanks: {
      open: ["You're welcome! Glad if it helped.", "Anytime."],
      ideas: [],
      ask: ["Want to work through something else?", "Is there anything else you'd like to think about?"],
    },
    greeting: {
      open: [
        "Hi! I'm THE BRIDGE guide. I help you calmly think through study, career and doubts.",
        "Hi! Good to see you.",
      ],
      ideas: [],
      ask: [
        "Tell me what's on your mind: choosing a career, studies, parents, fear of making a mistake, or something else?",
        "What would you like to talk about today?",
      ],
    },
    general: {
      open: ["Thanks for sharing. Let's figure it out together.", "I understand. To help more precisely, I need a few more details."],
      ideas: [
        "Try describing the situation in 2–3 sentences: what's happening and what worries you.",
        "You could start with the questionnaire: it helps you see your interests and strengths.",
      ],
      ask: [
        "What matters most to you about this right now?",
        "Is this more about choosing a career, about studies, or something else?",
      ],
    },
  },
};

/** Which platform story and experiment fit a topic (ids from src/content; missing ids are skipped). */
const TOPIC_CONTENT: Partial<Record<DemoTopic, { story?: string; experiment?: string; explore?: boolean; opportunities?: boolean }>> = {
  parents: { story: "real-sultankulov-prosecutor-to-developer" },
  abroad: { story: "real-duisekhan-full-grant-nyu-abu-dhabi", opportunities: true },
  money: { story: "real-aimagambetov-gap-year-grant", opportunities: true },
  hateMajor: { story: "real-erkenes-it-to-farming", explore: true },
  late: { story: "real-kozhakhmetova-teacher-to-it" },
  comparison: { story: "real-eseikyzy-finance-to-it" },
  noTalent: { experiment: "exp-psychology-diary", explore: true },
  tooMany: { story: "real-tleukulov-boxing-to-ai", explore: true },
  fear: { story: "real-nechaev-eco-fairy-tales", experiment: "exp-entrepreneurship-test" },
  tired: { story: "real-sembay-energy-to-teacher" },
  unknown: { story: "real-erkenes-it-to-farming", experiment: "exp-psychology-diary", explore: true },
  general: { explore: true },
};

function pick<T>(items: T[], turn: number): T {
  return items[turn % items.length];
}

/**
 * The demo guide's answer to the last message of the person, in the interface language.
 * `turn` (how many messages the person has sent) rotates the wording so repeated topics don't repeat replies.
 */
export function demoChatReply(messages: ChatMessage[], locale: Locale): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const turn = Math.max(0, messages.filter((m) => m.role === "user").length - 1);
  const topic = detectTopic(last);
  const shared = SHARED[locale];
  if (topic === "crisis") return shared.crisis;

  const copy = COPY[locale][topic];
  const direction = detectDirection(last);
  const content = TOPIC_CONTENT[topic] ?? {};
  const parts: string[] = [pick(copy.open, turn)];

  if (direction && topic === "direction") parts.push(shared.direction(pickText(DIRECTION_LABELS[direction], locale)));
  if (copy.ideas.length) parts.push([shared.ideasLead, ...copy.ideas.map((idea) => `- ${idea}`)].join("\n"));

  const links: string[] = [];
  const story = content.story ? STORIES.find((s) => s.id === content.story) : undefined;
  if (story && story.kind !== "user") links.push(shared.story(pickText(story.title, locale, story.lang), `/${locale}/stories/${story.id}`));
  const experiment =
    (direction && EXPERIMENTS.find((e) => e.direction === direction)) ||
    (content.experiment ? EXPERIMENTS.find((e) => e.id === content.experiment) : undefined);
  if (experiment) links.push(shared.experiment(experiment.title[locale], `/${locale}/try`));
  if (content.opportunities) links.push(shared.opportunities(`/${locale}/opportunities`));
  if (content.explore) links.push(shared.explore(`/${locale}/explore`));
  if (links.length) parts.push(links.join("\n\n"));

  parts.push(pick(copy.ask, turn));
  parts.push(shared.note);
  return parts.join("\n\n");
}
