import type { LocalizedText } from "@/lib/data/types";

/**
 * Copy for the rule-based report (demo mode / AI failure), in three languages.
 * Placeholders in {braces} are filled by fallback.ts. Wording rules: hypotheses, not
 * predictions; no "you are meant to"; no toxic positivity; money or background never closes a door.
 */
const t = (ru: string, kk: string, en: string): LocalizedText => ({ ru, kk, en });

export const FALLBACK_COPY = {
  listJoin: t(", ", ", ", ", "),
  nothingYet: t("пока не названо", "әзірге аталмаған", "not named yet"),

  // ---- 1. starting point
  startStage: t("Сейчас: {stage}, возраст — {age}.", "Қазір: {stage}, жасың — {age}.", "Right now: {stage}, age {age}."),
  startInterests: t("Больше всего тебя тянет к темам: {list}.", "Сені көбіне мына тақырыптар тартады: {list}.", "The topics that pull you most: {list}."),
  startUnsure: t(
    "Интересы пока трудно назвать — это частая и нормальная точка старта.",
    "Қызығушылықтарды әзірге атау қиын — бұл жиі кездесетін қалыпты бастау.",
    "Your interests are hard to name for now — a common and normal starting point.",
  ),
  startHard: t("Труднее всего сейчас: {list}.", "Қазір ең қиыны: {list}.", "What feels hardest right now: {list}."),
  startValues: t("Для тебя важно: {list}.", "Сен үшін маңызды: {list}.", "What matters to you: {list}."),
  startClose: t(
    "Это отправная точка для исследования, а не прогноз: ниже — гипотезы, которые можно проверить делом.",
    "Бұл болжам емес, зерттеудің бастапқы нүктесі: төменде іспен тексеруге болатын болжамдар бар.",
    "This is a starting point for exploring, not a forecast: below are hypotheses you can test in practice.",
  ),

  // ---- 2. patterns (scales: low = 1–2, high = 4–5)
  patternTeam: t(
    "Тебе легче работать в команде — стоит искать форматы, где есть с кем обсуждать идеи.",
    "Саған командада жұмыс істеу оңайырақ — идеяны талқылайтын адамдар бар форматтарды іздеген жөн.",
    "You find teamwork easier — look for formats where there are people to discuss ideas with.",
  ),
  patternAlone: t(
    "Тебе комфортнее работать самостоятельно — подойдут задачи, где можно сосредоточиться.",
    "Саған өз бетіңше жұмыс істеу ыңғайлырақ — назар аударуға болатын тапсырмалар қолайлы.",
    "You are more comfortable working on your own — tasks that allow focus may suit you.",
  ),
  patternPeople: t(
    "Общение тебя скорее заряжает — направления, где много людей, могут быть в радость.",
    "Қарым-қатынас сені көбіне қуаттандырады — адам көп бағыттар қуаныш сыйлауы мүмкін.",
    "Talking to people tends to energise you — people-heavy directions may feel good.",
  ),
  patternQuiet: t(
    "Тебе важна тишина и сосредоточенность — это стоит учитывать при выборе среды.",
    "Саған тыныштық пен зейін маңызды — ортаны таңдағанда мұны ескерген жөн.",
    "Quiet and focus matter to you — worth keeping in mind when choosing an environment.",
  ),
  patternPractice: t(
    "Ты лучше понимаешь через практику — короткие эксперименты подойдут тебе больше, чем долгое чтение.",
    "Сен практика арқылы жақсы түсінесің — ұзақ оқудан гөрі қысқа эксперименттер қолайлырақ.",
    "You learn best by doing — short experiments may suit you better than long reading.",
  ),
  patternTheory: t(
    "Тебе важно разобраться, почему всё устроено именно так, — глубокие темы могут увлечь.",
    "Саған бәрі неге осылай екенін түсіну маңызды — терең тақырыптар қызықтыруы мүмкін.",
    "You like to understand why things work as they do — deep topics may draw you in.",
  ),
  patternOpen: t(
    "Задачи без чётких инструкций тебя скорее интересуют, чем пугают.",
    "Нақты нұсқаусыз тапсырмалар сені қорқытудан гөрі қызықтырады.",
    "Tasks without clear instructions interest you more than they scare you.",
  ),
  patternRules: t(
    "Тебе спокойнее, когда правила ясны, — это сильная сторона в точных и ответственных задачах.",
    "Ереже анық болғанда саған тыныш — бұл нақты әрі жауапты істерде күшті жақ.",
    "You feel calmer when rules are clear — a strength in precise, responsible work.",
  ),
  patternNew: t(
    "Тебя тянет к новизне и экспериментам — пробовать разное для тебя естественно.",
    "Сені жаңалық пен эксперимент тартады — әртүрлі нәрсені сынау саған табиғи.",
    "You are drawn to novelty and experiments — trying different things comes naturally.",
  ),
  patternStable: t(
    "Тебе важна стабильность — разумно проверять новое маленькими шагами, без резких прыжков.",
    "Саған тұрақтылық маңызды — жаңаны күрт секірмей, кішкентай қадамдармен тексерген дұрыс.",
    "Stability matters to you — sensible to test new things in small steps, without big leaps.",
  ),
  patternWide: t(
    "У тебя разные интересы ({list}) — это не разброс, а материал для необычных сочетаний.",
    "Сенің қызығушылықтарың әртүрлі ({list}) — бұл шашыраңқылық емес, ерекше үйлесімдерге материал.",
    "You have varied interests ({list}) — not scattered, but material for unusual combinations.",
  ),
  patternDefault: t(
    "Ответов пока немного, чтобы увидеть устойчивые закономерности, — эксперименты помогут их найти.",
    "Тұрақты заңдылықтарды көруге жауаптар әзірге аз — эксперименттер оларды табуға көмектеседі.",
    "There are not enough answers yet to see stable patterns — experiments will help find them.",
  ),

  // ---- 3. things you might not have noticed
  unnoticedWrongChoice: t(
    "Ты боишься ошибиться с выбором. Маленькие эксперименты снижают цену ошибки: проверить можно за неделю, а не за годы.",
    "Сен қате таңдаудан қорқасың. Шағын эксперименттер қателіктің бағасын төмендетеді: жылдар емес, бір аптада тексеруге болады.",
    "You are afraid of choosing wrong. Small experiments lower the cost of a mistake: you can test in a week, not years.",
  ),
  unnoticedFamily: t(
    "Ожидания семьи и твои интересы не обязательно противоречат друг другу — иногда есть направления на их пересечении, и их можно показать близким на конкретных примерах.",
    "Отбасының күтуі мен сенің қызығушылығың бір-біріне қайшы болмауы мүмкін — кейде олардың тоғысында бағыттар бар, оларды жақындарыңа нақты мысалмен көрсетуге болады.",
    "Family expectations and your interests do not have to clash — sometimes there are directions where they meet, and you can show them to your family with concrete examples.",
  ),
  unnoticedMoney: t(
    "Ограничение по деньгам влияет на маршрут, но не на цель: есть стипендии, бесплатные курсы и программы обмена — их стоит изучить, а не отказываться от мечты заранее.",
    "Ақша шектеуі мақсатқа емес, бағытқа әсер етеді: стипендиялар, тегін курстар мен алмасу бағдарламалары бар — арманнан алдын ала бас тартпай, оларды зерттеген жөн.",
    "Money limits shape the route, not the goal: there are scholarships, free courses and exchange programmes — worth exploring before giving up on anything.",
  ),
  unnoticedTalent: t(
    "Ощущение «у меня нет таланта» часто значит, что проб было ещё мало. Навыки растут от практики, а интерес — от того, что начинает получаться.",
    "«Менде талант жоқ» деген сезім көбіне сынақтың әлі аз болғанын білдіреді. Дағды практикадан, қызығушылық — бірдеңе шыға бастағанда өседі.",
    "Feeling \"I have no talent\" often means there have not been many tries yet. Skills grow with practice, and interest grows as things start to work.",
  ),
  unnoticedTooLate: t(
    "Ощущение «уже поздно» знакомо многим. Опыт, который у тебя уже есть, переносится в новое направление — это преимущество, а не потерянное время.",
    "«Кеш болды» деген сезім көпшілікке таныс. Сендегі бар тәжірибе жаңа бағытқа ауысады — бұл жоғалған уақыт емес, артықшылық.",
    "Many people know the \"it's too late\" feeling. The experience you already have carries over to a new direction — an advantage, not lost time.",
  ),
  unnoticedCompare: t(
    "Сравнение с другими показывает только их результат, а не путь и стартовые условия. Полезнее сравнивать себя с собой месяц назад.",
    "Басқалармен салыстыру олардың жолы мен бастауын емес, тек нәтижесін көрсетеді. Өзіңді бір ай бұрынғы өзіңмен салыстырған пайдалырақ.",
    "Comparing yourself with others shows only their result, not their path or starting point. Comparing yourself with you a month ago is more useful.",
  ),
  unnoticedExperience: t(
    "У тебя уже есть опыт ({list}). Его легко недооценить, но это реальные доказательства навыков.",
    "Сенде қазірдің өзінде тәжірибе бар ({list}). Оны бағаламау оңай, бірақ бұл дағдының нақты дәлелі.",
    "You already have experience ({list}). It is easy to underestimate, but it is real evidence of skills.",
  ),
  unnoticedLanguage: t(
    "Язык — это навык, который растёт постепенно; многие программы принимают с базовым уровнем и помогают его подтянуть.",
    "Тіл — біртіндеп өсетін дағды; көп бағдарлама базалық деңгеймен қабылдап, оны жақсартуға көмектеседі.",
    "Language is a skill that grows step by step; many programmes accept a basic level and help you improve.",
  ),
  unnoticedNoIdea: t(
    "Не знать, что нравится, — не недостаток, а честная точка старта. Интересы чаще находятся в действии, чем в размышлениях.",
    "Не ұнайтынын білмеу — кемшілік емес, адал бастау. Қызығушылық ойланғаннан гөрі іс-әрекетте жиі табылады.",
    "Not knowing what you like is not a flaw but an honest starting point. Interests are found in action more often than in thinking.",
  ),
  unnoticedDefault: t(
    "Твои ответы — это не ярлык, а снимок «на сегодня». Через пару месяцев экспериментов картина может измениться, и это нормально.",
    "Сенің жауаптарың — белгі емес, «бүгінгі» сурет. Бірнеше ай эксперименттен кейін сурет өзгеруі мүмкін, бұл қалыпты.",
    "Your answers are not a label but a snapshot of today. After a couple of months of experiments the picture may change, and that is fine.",
  ),

  // ---- 4. directions
  whyFallbackReasons: t("твои ответы в целом", "жалпы жауаптарың", "your answers overall"),
  testExperiment: t("Эксперимент «{title}» ({time})", "«{title}» эксперименті ({time})", "Experiment \"{title}\" ({time})"),

  // ---- 6. unexpected
  unexpectedWhy: t(
    "Неочевидное направление рядом с «{near}». Твои ответы на него почти не указывают, но оно использует похожие навыки — иногда интерес появляется там, где не ждёшь.",
    "«{near}» бағытының жанындағы күтпеген бағыт. Жауаптарың оған көп нұсқамайды, бірақ ол ұқсас дағдыларды қажет етеді — кейде қызығушылық күтпеген жерден табылады.",
    "A less obvious direction next to \"{near}\". Your answers barely point to it, but it uses similar skills — sometimes interest appears where you least expect it.",
  ),

  // ---- 8. roadmap
  d7Experiment: t("Пройди эксперимент «{title}» ({time})", "«{title}» экспериментін өт ({time})", "Do the experiment \"{title}\" ({time})"),
  d7Reflect: t(
    "После эксперимента запиши: понравился сам процесс или только идея?",
    "Эксперименттен кейін жаз: процестің өзі ұнады ма, әлде тек идеясы ма?",
    "After the experiment, write down: did you enjoy the process itself, or only the idea?",
  ),
  d7Story: t("Прочитай похожую историю: «{title}»", "Ұқсас әңгімені оқы: «{title}»", "Read a similar story: \"{title}\""),
  d30Experiment: t("Попробуй ещё одно направление: «{title}»", "Тағы бір бағытты сынап көр: «{title}»", "Try one more direction: \"{title}\""),
  d30Talk: t(
    "Поговори с человеком, который работает в направлении «{direction}», — спроси про обычный рабочий день",
    "«{direction}» бағытында жұмыс істейтін адаммен сөйлес — әдеттегі жұмыс күнін сұра",
    "Talk to someone working in \"{direction}\" — ask about an ordinary working day",
  ),
  d30Compare: t(
    "Сравни впечатления от экспериментов в дневнике: что дало энергию, а что забрало",
    "Эксперименттерден алған әсеріңді күнделікте салыстыр: не қуат берді, не алды",
    "Compare your experiment notes in the journal: what gave you energy and what drained it",
  ),
  d90Deepen: t(
    "Выбери 1–2 направления, которые понравились на практике, и найди курс, кружок или волонтёрство по ним",
    "Іс жүзінде ұнаған 1–2 бағытты таңдап, олар бойынша курс, үйірме не еріктілік тап",
    "Pick 1–2 directions you enjoyed in practice and find a course, club or volunteering in them",
  ),
  d90Opportunities: t(
    "Посмотри стипендии и бесплатные программы в разделе «Возможности»; дедлайны уточняй на официальных сайтах",
    "«Мүмкіндіктер» бөлімінен стипендиялар мен тегін бағдарламаларды қара; мерзімдерін ресми сайттардан нақтыла",
    "Look at scholarships and free programmes in Opportunities; check deadlines on the official sites",
  ),
  d90Repeat: t(
    "Пройди анкету ещё раз и сравни отчёты — интересы меняются, и это нормально",
    "Сауалнаманы қайта өтіп, есептерді салыстыр — қызығушылықтар өзгереді, бұл қалыпты",
    "Take the questionnaire again and compare reports — interests change, and that is fine",
  ),
} as const;

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
