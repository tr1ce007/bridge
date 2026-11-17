import type { LocalizedList, LocalizedText } from "@/lib/data/types";
import type { TagRef } from "@/lib/matching/answer-tags";

export type ScaleId = "C1" | "C2" | "C3" | "C4" | "C5";

/**
 * One direction of the rule-based (demo) report. All copy is in three languages.
 * `why` contains `{reasons}`, replaced with the person's matching answers.
 * Wording rule: directions are hypotheses to test, never a verdict about who someone is.
 */
export interface DirectionEntry {
  id: string;
  label: LocalizedText;
  /** How strongly each answer tag points to this direction. */
  affinity: Partial<Record<TagRef, number>>;
  /** Scale leanings (C1 alone→team, C2 quiet→people, C3 practice→theory, C4 rules→open, C5 stable→new). */
  scales?: Partial<Record<ScaleId, "low" | "high">>;
  why: LocalizedText;
  difficulties: LocalizedList;
  skills: LocalizedList;
  howToTest: LocalizedList;
  realityCheck: { activities: LocalizedList; misconceptions: LocalizedList; entryRoutes: LocalizedList };
  /** Experiments from src/content/experiments.json that test this direction (first = best fit). */
  experimentIds: string[];
  /** Neighbouring directions, used to pick "unexpected" options. */
  adjacent: string[];
}

const t = (ru: string, kk: string, en: string): LocalizedText => ({ ru, kk, en });
const l = (ru: string[], kk: string[], en: string[]): LocalizedList => ({ ru, kk, en });

export const DIRECTION_CATALOGUE: DirectionEntry[] = [
  {
    id: "international-relations",
    label: t("Международные отношения и дипломатия", "Халықаралық қатынастар және дипломатия", "International relations and diplomacy"),
    affinity: { "interests:law-politics": 3, "interests:languages-culture": 3, "interests:people": 1, "motives:impact": 1, "decisions:move-abroad": 1, "start:abroad-or-diaspora": 1 },
    scales: { C2: "high", C3: "high" },
    why: t(
      "Это направление перекликается с тем, что ты отметил(а): {reasons}. Здесь важно разбираться в людях, странах и языках — это стоит проверить на практике.",
      "Бұл бағыт сен белгілеген нәрселермен үндес: {reasons}. Мұнда адамдарды, елдерді және тілдерді түсіну маңызды — мұны іс жүзінде тексеріп көрген жөн.",
      "This direction connects with what you chose: {reasons}. It is about understanding people, countries and languages — worth testing in practice.",
    ),
    difficulties: l(
      ["Много чтения и сложных текстов", "Нужен хороший уровень английского, часто и второго языка"],
      ["Көп оқу және күрделі мәтіндер", "Ағылшын тілін жақсы білу, көбіне екінші тіл де қажет"],
      ["Lots of reading and dense texts", "A good level of English, often a second foreign language too"],
    ),
    skills: l(
      ["Аналитическое письмо", "Иностранные языки", "Переговоры"],
      ["Аналитикалық жазу", "Шет тілдері", "Келіссөз жүргізу"],
      ["Analytical writing", "Foreign languages", "Negotiation"],
    ),
    howToTest: l(
      ["Посмотри запись заседания ООН или МИД и выпиши позиции сторон", "Найди клуб модели ООН в своём городе или онлайн"],
      ["БҰҰ не СІМ отырысының жазбасын көріп, тараптардың ұстанымын жаз", "Қалаңдағы не онлайн БҰҰ моделі клубын тап"],
      ["Watch a recorded UN or foreign ministry session and note each side's position", "Find a Model UN club in your city or online"],
    ),
    realityCheck: {
      activities: l(
        ["Анализ новостей и документов", "Подготовка справок и записок", "Встречи и переговоры"],
        ["Жаңалықтар мен құжаттарды талдау", "Анықтама мен жазбалар дайындау", "Кездесулер мен келіссөздер"],
        ["Analysing news and documents", "Writing briefs and memos", "Meetings and negotiations"],
      ),
      misconceptions: l(
        ["Это не только приёмы и поездки — большая часть работы за столом с документами"],
        ["Бұл тек қабылдаулар мен сапарлар емес — жұмыстың көбі құжаттармен үстел басында"],
        ["It is not mostly receptions and travel — much of the work is desk work with documents"],
      ),
      entryRoutes: l(
        ["Бакалавриат по МО, политологии или регионоведению", "Стажировки в НКО, международных организациях, посольствах"],
        ["ХҚ, саясаттану не аймақтану бакалавриаты", "ҮЕҰ, халықаралық ұйымдар, елшіліктердегі тағылымдамалар"],
        ["A bachelor's in IR, political science or area studies", "Internships at NGOs, international organisations, embassies"],
      ),
    },
    experimentIds: ["exp-diplomacy-memo"],
    adjacent: ["public-policy", "law", "media", "social-impact"],
  },
  {
    id: "entrepreneurship",
    label: t("Предпринимательство", "Кәсіпкерлік", "Entrepreneurship"),
    affinity: { "interests:business": 3, "motives:freedom": 2, "motives:money": 1, "decisions:side-project": 2, "decisions:experiments": 1, "motives:recognition": 1 },
    scales: { C4: "high", C5: "high" },
    why: t(
      "Здесь пересекается то, что ты назвал(а): {reasons}. Предпринимательство — это постоянные пробы и проверки идей на людях, и начать можно с очень маленького шага.",
      "Мұнда сен атаған нәрселер тоғысады: {reasons}. Кәсіпкерлік — идеяларды адамдарда үнемі сынау, және өте кішкентай қадамнан бастауға болады.",
      "This is where several of your answers meet: {reasons}. Entrepreneurship means constantly testing ideas on real people, and you can start very small.",
    ),
    difficulties: l(
      ["Нестабильный доход в начале", "Много решений без чётких инструкций"],
      ["Басында тұрақсыз табыс", "Нақты нұсқаусыз көп шешім қабылдау"],
      ["Unstable income at the start", "Many decisions without clear instructions"],
    ),
    skills: l(
      ["Общение с клиентами", "Базовые финансы", "Быстрая проверка идей"],
      ["Клиенттермен сөйлесу", "Негізгі қаржы сауаты", "Идеяны жылдам тексеру"],
      ["Talking to customers", "Basic finance", "Testing ideas quickly"],
    ),
    howToTest: l(
      ["Опиши одну проблему, которую хочешь решить, и спроси о ней пятерых людей", "Попробуй продать что-то маленькое: услугу, поделку, помощь"],
      ["Шешкің келетін бір мәселені жазып, бес адамнан сұра", "Кішкене бір нәрсені сатып көр: қызмет, қолөнер, көмек"],
      ["Describe one problem you want to solve and ask five people about it", "Try selling something small: a service, a craft, help"],
    ),
    realityCheck: {
      activities: l(
        ["Разговоры с клиентами", "Учёт денег и планирование", "Поиск партнёров"],
        ["Клиенттермен әңгіме", "Ақшаны есепке алу және жоспарлау", "Серіктес іздеу"],
        ["Customer conversations", "Tracking money and planning", "Finding partners"],
      ),
      misconceptions: l(
        ["Большинство проектов не «выстреливают» сразу — это нормальная часть пути"],
        ["Көп жоба бірден табысқа жетпейді — бұл жолдың қалыпты бөлігі"],
        ["Most projects do not take off right away — that is a normal part of the path"],
      ),
      entryRoutes: l(
        ["Маленький проект параллельно с учёбой или работой", "Бизнес-инкубаторы и акселераторы при вузах"],
        ["Оқу не жұмыспен қатар шағын жоба", "ЖОО жанындағы бизнес-инкубаторлар мен акселераторлар"],
        ["A small project alongside study or work", "University business incubators and accelerators"],
      ),
    },
    experimentIds: ["exp-entrepreneurship-test"],
    adjacent: ["social-impact", "sports-management", "design", "media"],
  },
  {
    id: "public-policy",
    label: t("Государственная политика и управление", "Мемлекеттік саясат және басқару", "Public policy and administration"),
    affinity: { "interests:law-politics": 3, "interests:social-impact": 2, "motives:impact": 2, "motives:stability": 1, "challenges:information": 0.5 },
    scales: { C3: "high", C1: "high" },
    why: t(
      "Это направление связано с тем, что ты отметил(а): {reasons}. Политика и управление — это про то, как решения влияют на жизнь многих людей.",
      "Бұл бағыт сен белгілеген нәрселерге байланысты: {reasons}. Саясат пен басқару — шешімдердің көп адамның өміріне қалай әсер ететіні туралы.",
      "This direction relates to what you chose: {reasons}. Policy is about how decisions shape the lives of many people.",
    ),
    difficulties: l(
      ["Изменения происходят медленно", "Нужно разбираться в законах и цифрах"],
      ["Өзгерістер баяу жүреді", "Заңдар мен сандарды түсіну керек"],
      ["Change happens slowly", "You need to understand laws and numbers"],
    ),
    skills: l(
      ["Анализ данных и документов", "Ясное письмо", "Работа с разными сторонами"],
      ["Деректер мен құжаттарды талдау", "Түсінікті жазу", "Әртүрлі тараптармен жұмыс"],
      ["Analysing data and documents", "Clear writing", "Working with different stakeholders"],
    ),
    howToTest: l(
      ["Выбери одну проблему своего города и найди, какое решение по ней уже принято", "Сходи на открытое заседание маслихата или посмотри его запись"],
      ["Қалаңның бір мәселесін таңдап, ол бойынша қандай шешім қабылданғанын тап", "Мәслихаттың ашық отырысына бар не жазбасын көр"],
      ["Pick one problem in your city and find what decision has already been made on it", "Attend an open city council session or watch a recording"],
    ),
    realityCheck: {
      activities: l(
        ["Подготовка аналитических записок", "Встречи с гражданами и экспертами", "Работа с бюджетом и показателями"],
        ["Аналитикалық жазба дайындау", "Азаматтармен және сарапшылармен кездесу", "Бюджет пен көрсеткіштермен жұмыс"],
        ["Writing policy briefs", "Meeting citizens and experts", "Working with budgets and indicators"],
      ),
      misconceptions: l(
        ["Это не только госслужба: аналитические центры и НКО тоже работают с политикой"],
        ["Бұл тек мемлекеттік қызмет емес: талдау орталықтары мен ҮЕҰ да саясатпен айналысады"],
        ["It is not only civil service: think tanks and NGOs work on policy too"],
      ),
      entryRoutes: l(
        ["Бакалавриат или магистратура по госуправлению, экономике, социологии", "Стажировки в госорганах, акиматах, аналитических центрах"],
        ["Мемлекеттік басқару, экономика, әлеуметтану бойынша бакалавриат не магистратура", "Мемлекеттік органдарда, әкімдіктерде, талдау орталықтарында тағылымдама"],
        ["A degree in public administration, economics or sociology", "Internships in government bodies, city administrations, think tanks"],
      ),
    },
    experimentIds: ["exp-diplomacy-memo", "exp-research-mini-survey"],
    adjacent: ["international-relations", "law", "social-impact", "research"],
  },
  {
    id: "psychology",
    label: t("Психология", "Психология", "Psychology"),
    affinity: { "interests:people": 3, "interests:health": 1, "motives:impact": 1, "motives:curiosity": 1, "challenges:confidence": 0.5, "decisions:volunteering": 1 },
    scales: { C2: "high" },
    why: t(
      "Ты отметил(а): {reasons}. Психология — про то, как люди думают, чувствуют и принимают решения; это интерес, который можно проверить уже сейчас.",
      "Сен белгіледің: {reasons}. Психология — адамдардың қалай ойлайтыны, сезінетіні және шешім қабылдайтыны туралы; бұл қызығушылықты қазір-ақ тексеруге болады.",
      "You chose: {reasons}. Psychology is about how people think, feel and decide; it is an interest you can test right now.",
    ),
    difficulties: l(
      ["Долгое обучение до самостоятельной практики", "Эмоционально тяжёлые истории других людей"],
      ["Өз бетінше тәжірибеге дейін ұзақ оқу", "Басқа адамдардың эмоционалды ауыр оқиғалары"],
      ["Long training before independent practice", "Emotionally heavy stories from other people"],
    ),
    skills: l(
      ["Внимательное слушание", "Основы статистики и исследований", "Эмпатия с границами"],
      ["Мұқият тыңдау", "Статистика мен зерттеу негіздері", "Шекарасы бар эмпатия"],
      ["Careful listening", "Basics of statistics and research", "Empathy with boundaries"],
    ),
    howToTest: l(
      ["Прочитай одну научно-популярную книгу по психологии и отметь, что зацепило", "Попробуй волонтёрство на линии поддержки после обучения"],
      ["Психология бойынша бір ғылыми-көпшілік кітап оқып, не қызықтырғанын белгіле", "Оқудан кейін қолдау желісінде ерікті болып көр"],
      ["Read one popular-science psychology book and note what hooked you", "Try volunteering on a support line after training"],
    ),
    realityCheck: {
      activities: l(
        ["Беседы и консультации", "Тесты и исследования", "Записи и отчёты"],
        ["Әңгіме және кеңес беру", "Тесттер мен зерттеулер", "Жазбалар мен есептер"],
        ["Conversations and counselling", "Assessments and research", "Notes and reports"],
      ),
      misconceptions: l(
        ["Психолог не «читает мысли» и не даёт советов, как жить, — он помогает человеку разобраться самому"],
        ["Психолог «ой оқымайды» және қалай өмір сүру керектігін айтпайды — адамға өзі түсінуге көмектеседі"],
        ["A psychologist does not read minds or tell people how to live — they help people figure things out themselves"],
      ),
      entryRoutes: l(
        ["Бакалавриат по психологии", "Смежный путь: HR, исследования пользователей, образование"],
        ["Психология бакалавриаты", "Іргелес жол: HR, пайдаланушыларды зерттеу, білім беру"],
        ["A bachelor's in psychology", "Adjacent routes: HR, user research, education"],
      ),
    },
    experimentIds: ["exp-psychology-diary"],
    adjacent: ["education", "medicine", "research", "social-impact"],
  },
  {
    id: "technology",
    label: t("Программирование и технологии", "Бағдарламалау және технологиялар", "Programming and technology"),
    affinity: { "interests:tech": 3, "interests:science": 1, "motives:freedom": 1, "motives:curiosity": 1, "education:self-taught": 1, "decisions:side-project": 1 },
    scales: { C3: "low", C4: "high" },
    why: t(
      "Ты отметил(а): {reasons}. В технологиях много самостоятельных проб и ошибок, а проверить интерес можно маленькой программой за вечер.",
      "Сен белгіледің: {reasons}. Технологияда өз бетінше сынау мен қателесу көп, ал қызығушылықты бір кеште шағын бағдарламамен тексеруге болады.",
      "You chose: {reasons}. Technology involves a lot of trial and error on your own, and you can test the interest with a small program in one evening.",
    ),
    difficulties: l(
      ["Много самостоятельного разбора ошибок", "Технологии быстро меняются — учиться приходится постоянно"],
      ["Қателерді өз бетінше көп талдау", "Технология тез өзгереді — үнемі оқу керек"],
      ["Lots of debugging on your own", "Tools change fast — learning never stops"],
    ),
    skills: l(
      ["Логическое мышление", "Английский для документации", "Терпение к ошибкам"],
      ["Логикалық ойлау", "Құжаттамаға арналған ағылшын тілі", "Қателерге төзімділік"],
      ["Logical thinking", "English for documentation", "Patience with errors"],
    ),
    howToTest: l(
      ["Пройди первые уроки бесплатного курса (например, CS50) и отметь, понравился ли процесс", "Сделай маленький проект для себя: бота, страницу, скрипт"],
      ["Тегін курстың (мысалы, CS50) алғашқы сабақтарын өтіп, процесс ұнады ма — белгіле", "Өзіңе шағын жоба жаса: бот, бет, скрипт"],
      ["Do the first lessons of a free course (e.g. CS50) and note whether you enjoyed the process", "Build a small project for yourself: a bot, a page, a script"],
    ),
    realityCheck: {
      activities: l(
        ["Написание и чтение кода", "Поиск и исправление ошибок", "Обсуждение задач с командой"],
        ["Код жазу және оқу", "Қателерді іздеу және түзету", "Тапсырмаларды командамен талқылау"],
        ["Writing and reading code", "Finding and fixing bugs", "Discussing tasks with a team"],
      ),
      misconceptions: l(
        ["Не нужно быть «гением математики» — важнее регулярная практика"],
        ["«Математика данышпаны» болу міндетті емес — тұрақты практика маңыздырақ"],
        ["You do not need to be a maths genius — regular practice matters more"],
      ),
      entryRoutes: l(
        ["Вуз по IT или самообучение с портфолио", "Стажировки, open source, хакатоны"],
        ["IT бойынша ЖОО не портфолиомен өздігінен оқу", "Тағылымдамалар, open source, хакатондар"],
        ["An IT degree or self-study with a portfolio", "Internships, open source, hackathons"],
      ),
    },
    experimentIds: ["exp-programming-first"],
    adjacent: ["data-ml", "engineering", "design", "entrepreneurship"],
  },
  {
    id: "data-ml",
    label: t("Данные и машинное обучение", "Деректер және машиналық оқыту", "Data and machine learning"),
    affinity: { "interests:tech": 2, "interests:science": 2, "motives:curiosity": 1.5, "interests:business": 0.5 },
    scales: { C3: "high", C4: "high", C1: "low" },
    why: t(
      "Это направление связано с тем, что ты отметил(а): {reasons}. Работа с данными — это поиск закономерностей и ответов на вопросы с помощью чисел и кода.",
      "Бұл бағыт сен белгілеген нәрселерге байланысты: {reasons}. Деректермен жұмыс — сандар мен код арқылы заңдылықтар мен жауаптар іздеу.",
      "This direction relates to what you chose: {reasons}. Working with data means finding patterns and answers with numbers and code.",
    ),
    difficulties: l(
      ["Нужна математика: статистика, линейная алгебра", "Большая часть времени уходит на очистку данных"],
      ["Математика қажет: статистика, сызықтық алгебра", "Уақыттың көбі деректерді тазалауға кетеді"],
      ["Maths is needed: statistics, linear algebra", "Most of the time goes into cleaning data"],
    ),
    skills: l(
      ["Python и SQL", "Статистика", "Умение задавать точный вопрос"],
      ["Python және SQL", "Статистика", "Нақты сұрақ қоя білу"],
      ["Python and SQL", "Statistics", "Asking precise questions"],
    ),
    howToTest: l(
      ["Возьми открытую таблицу (погода, спорт, цены) и найди в ней одну закономерность", "Пройди вводный бесплатный курс по анализу данных"],
      ["Ашық кестені (ауа райы, спорт, бағалар) алып, бір заңдылық тап", "Деректерді талдау бойынша тегін кіріспе курс өт"],
      ["Take an open table (weather, sport, prices) and find one pattern in it", "Take a free introductory data analysis course"],
    ),
    realityCheck: {
      activities: l(
        ["Сбор и очистка данных", "Построение моделей и графиков", "Объяснение выводов людям без технического фона"],
        ["Деректерді жинау және тазалау", "Модельдер мен графиктер құру", "Қорытындыны техникалық емес адамдарға түсіндіру"],
        ["Collecting and cleaning data", "Building models and charts", "Explaining results to non-technical people"],
      ),
      misconceptions: l(
        ["ML — это не только нейросети: много работы с обычными таблицами"],
        ["ML — тек нейрожелі емес: кәдімгі кестелермен жұмыс көп"],
        ["ML is not just neural networks: a lot of the work is ordinary tables"],
      ),
      entryRoutes: l(
        ["Бакалавриат по математике, CS, экономике; магистратура по ML", "Аналитик данных как первая роль"],
        ["Математика, CS, экономика бакалавриаты; ML магистратурасы", "Алғашқы рөл ретінде деректер талдаушысы"],
        ["A bachelor's in maths, CS or economics; a master's in ML", "Data analyst as a first role"],
      ),
    },
    experimentIds: ["exp-data-first-analysis", "exp-research-mini-survey"],
    adjacent: ["technology", "research", "sports-management", "public-policy"],
  },
  {
    id: "education",
    label: t("Образование и преподавание", "Білім беру және оқыту", "Education and teaching"),
    affinity: { "interests:education": 3, "interests:people": 1.5, "motives:impact": 1.5, "motives:belonging": 1, "decisions:mentor": 0.5 },
    scales: { C2: "high", C1: "high" },
    why: t(
      "Ты отметил(а): {reasons}. Образование — это помогать другим понимать и расти; проверить это можно одним мини-уроком.",
      "Сен белгіледің: {reasons}. Білім беру — басқаларға түсінуге және өсуге көмектесу; мұны бір шағын сабақпен тексеруге болады.",
      "You chose: {reasons}. Education is about helping others understand and grow; one mini-lesson is enough to start testing it.",
    ),
    difficulties: l(
      ["Большая нагрузка и много подготовки", "Не все ученики мотивированы"],
      ["Жүктеме көп және дайындық көп", "Оқушылардың бәрі бірдей ынталы емес"],
      ["A heavy workload and lots of preparation", "Not every learner is motivated"],
    ),
    skills: l(
      ["Объяснять сложное просто", "Терпение", "Планирование занятий"],
      ["Күрделіні қарапайым түсіндіру", "Шыдамдылық", "Сабақты жоспарлау"],
      ["Explaining complex things simply", "Patience", "Lesson planning"],
    ),
    howToTest: l(
      ["Объясни младшему брату, сестре или другу тему, которую знаешь хорошо", "Стань волонтёром-репетитором на месяц"],
      ["Жақсы білетін тақырыпты інің, қарындасың не досыңа түсіндір", "Бір айға ерікті репетитор бол"],
      ["Explain a topic you know well to a younger sibling or a friend", "Volunteer as a tutor for a month"],
    ),
    realityCheck: {
      activities: l(
        ["Подготовка материалов", "Занятия и обратная связь", "Общение с родителями и коллегами"],
        ["Материал дайындау", "Сабақ және кері байланыс", "Ата-аналармен және әріптестермен сөйлесу"],
        ["Preparing materials", "Teaching and feedback", "Talking with parents and colleagues"],
      ),
      misconceptions: l(
        ["Образование — это не только школа: есть онлайн-курсы, методисты, корпоративное обучение"],
        ["Білім беру — тек мектеп емес: онлайн курстар, әдіскерлер, корпоративтік оқыту бар"],
        ["Education is not only schools: there are online courses, curriculum designers, corporate training"],
      ),
      entryRoutes: l(
        ["Педагогический вуз или предметная специальность + педагогика", "Репетиторство, лагеря, онлайн-школы"],
        ["Педагогикалық ЖОО не пәндік мамандық + педагогика", "Репетиторлық, лагерьлер, онлайн мектептер"],
        ["A teaching degree or a subject degree plus pedagogy", "Tutoring, camps, online schools"],
      ),
    },
    experimentIds: ["exp-education-mini-lesson"],
    adjacent: ["psychology", "social-impact", "media", "research"],
  },
  {
    id: "design",
    label: t("Дизайн и креативные индустрии", "Дизайн және шығармашылық индустриялар", "Design and creative industries"),
    affinity: { "interests:creative": 3, "interests:tech": 0.5, "motives:freedom": 1, "motives:recognition": 0.5, "decisions:side-project": 1 },
    scales: { C3: "low", C5: "high" },
    why: t(
      "Это направление перекликается с тем, что ты отметил(а): {reasons}. В дизайне идеи быстро становятся видимыми, и проверить интерес можно одной переделкой экрана или плаката.",
      "Бұл бағыт сен белгілеген нәрселермен үндес: {reasons}. Дизайнда идея тез көрінеді, ал қызығушылықты бір экранды не плакатты қайта жасаумен тексеруге болады.",
      "This direction connects with what you chose: {reasons}. In design ideas become visible quickly, and redoing one screen or poster is enough to test it.",
    ),
    difficulties: l(
      ["Много правок и критики", "Нужно портфолио, а не только диплом"],
      ["Түзету мен сын көп", "Тек диплом емес, портфолио керек"],
      ["Lots of revisions and critique", "You need a portfolio, not just a diploma"],
    ),
    skills: l(
      ["Визуальное мышление", "Работа в Figma или похожих инструментах", "Умение принимать обратную связь"],
      ["Көрнекі ойлау", "Figma не ұқсас құралдармен жұмыс", "Кері байланысты қабылдай білу"],
      ["Visual thinking", "Working in Figma or similar tools", "Taking feedback well"],
    ),
    howToTest: l(
      ["Переделай один неудобный экран приложения и покажи двум людям", "Повтори работу дизайнера, которая нравится, чтобы понять, как она сделана"],
      ["Қолданбаның бір ыңғайсыз экранын қайта жасап, екі адамға көрсет", "Ұнайтын дизайнер жұмысын қайталап, қалай жасалғанын түсін"],
      ["Redo one awkward app screen and show it to two people", "Recreate a design you like to understand how it was made"],
    ),
    realityCheck: {
      activities: l(
        ["Исследование пользователей", "Эскизы и макеты", "Обсуждения с заказчиком и командой"],
        ["Пайдаланушыларды зерттеу", "Эскиздер мен макеттер", "Тапсырыс берушімен және командамен талқылау"],
        ["User research", "Sketches and mock-ups", "Discussions with clients and the team"],
      ),
      misconceptions: l(
        ["Дизайн — это не про «красиво», а про то, чтобы было понятно и удобно"],
        ["Дизайн — «әдемі» болу емес, түсінікті әрі ыңғайлы болу туралы"],
        ["Design is less about \"pretty\" and more about clear and usable"],
      ),
      entryRoutes: l(
        ["Курсы и портфолио из 3–5 работ", "Вуз по дизайну или смежной специальности"],
        ["Курстар және 3–5 жұмыстан тұратын портфолио", "Дизайн не іргелес мамандық бойынша ЖОО"],
        ["Courses and a portfolio of 3–5 pieces", "A design degree or a related field"],
      ),
    },
    experimentIds: ["exp-design-redo"],
    adjacent: ["media", "technology", "entrepreneurship", "education"],
  },
  {
    id: "research",
    label: t("Наука и исследования", "Ғылым және зерттеу", "Science and research"),
    affinity: { "interests:science": 3, "motives:curiosity": 2, "interests:nature": 0.5, "interests:health": 0.5, "decisions:mentor": 0.5 },
    scales: { C3: "high", C4: "high", C1: "low" },
    why: t(
      "Ты отметил(а): {reasons}. Исследования — это задавать вопросы и проверять ответы; маленький опрос или наблюдение уже похожи на настоящую научную работу.",
      "Сен белгіледің: {reasons}. Зерттеу — сұрақ қойып, жауапты тексеру; шағын сауалнама не бақылау нағыз ғылыми жұмысқа ұқсайды.",
      "You chose: {reasons}. Research means asking questions and checking answers; a small survey or observation already resembles real research.",
    ),
    difficulties: l(
      ["Долгий путь: магистратура, часто PhD", "Результаты бывают не сразу и не всегда"],
      ["Ұзақ жол: магистратура, көбіне PhD", "Нәтиже бірден және әрдайым бола бермейді"],
      ["A long path: a master's, often a PhD", "Results come slowly and not always"],
    ),
    skills: l(
      ["Критическое мышление", "Статистика", "Академическое письмо на английском"],
      ["Сыни ойлау", "Статистика", "Ағылшынша академиялық жазу"],
      ["Critical thinking", "Statistics", "Academic writing in English"],
    ),
    howToTest: l(
      ["Сформулируй один вопрос и проведи мини-опрос десяти человек", "Напиши преподавателю или учёному и спроси, можно ли помочь в проекте"],
      ["Бір сұрақ құрастырып, он адамнан шағын сауалнама жүргіз", "Оқытушыға не ғалымға жазып, жобаға көмектесуге бола ма деп сұра"],
      ["Frame one question and run a mini-survey of ten people", "Write to a lecturer or scientist and ask if you can help on a project"],
    ),
    realityCheck: {
      activities: l(
        ["Чтение статей", "Эксперименты и сбор данных", "Написание статей и заявок на гранты"],
        ["Мақалалар оқу", "Тәжірибе және деректер жинау", "Мақала мен грант өтінімдерін жазу"],
        ["Reading papers", "Experiments and data collection", "Writing papers and grant proposals"],
      ),
      misconceptions: l(
        ["Наука — это не одиночество в лаборатории: много командной работы и обсуждений"],
        ["Ғылым — зертханадағы жалғыздық емес: командалық жұмыс пен талқылау көп"],
        ["Science is not solitude in a lab: there is a lot of teamwork and discussion"],
      ),
      entryRoutes: l(
        ["Бакалавриат по науке + участие в проектах преподавателей", "Магистратура и PhD, часто с финансированием"],
        ["Ғылым бакалавриаты + оқытушылардың жобаларына қатысу", "Магистратура және PhD, көбіне қаржыландырумен"],
        ["A science bachelor's plus helping on lecturers' projects", "A master's and PhD, often funded"],
      ),
    },
    experimentIds: ["exp-research-mini-survey"],
    adjacent: ["data-ml", "medicine", "environment", "psychology"],
  },
  {
    id: "social-impact",
    label: t("Социальные проекты и НКО", "Әлеуметтік жобалар және ҮЕҰ", "Social impact and non-profits"),
    affinity: { "interests:social-impact": 3, "motives:impact": 2, "decisions:volunteering": 2, "interests:people": 1, "motives:belonging": 1 },
    scales: { C1: "high", C2: "high" },
    why: t(
      "Ты отметил(а): {reasons}. Социальные проекты — это решать конкретные проблемы людей вокруг; одна смена волонтёрства покажет, какой формат тебе ближе.",
      "Сен белгіледің: {reasons}. Әлеуметтік жобалар — айналадағы адамдардың нақты мәселелерін шешу; бір ерікті ауысым қай формат жақын екенін көрсетеді.",
      "You chose: {reasons}. Social impact means solving concrete problems for people around you; one volunteering shift will show which format suits you.",
    ),
    difficulties: l(
      ["Скромные зарплаты в начале", "Риск выгорания"],
      ["Басында жалақы қарапайым", "Күйіп қалу қаупі"],
      ["Modest pay at the start", "A risk of burnout"],
    ),
    skills: l(
      ["Организация людей", "Написание заявок на гранты", "Работа с сообществом"],
      ["Адамдарды ұйымдастыру", "Грант өтінімдерін жазу", "Қауымдастықпен жұмыс"],
      ["Organising people", "Writing grant applications", "Community work"],
    ),
    howToTest: l(
      ["Выйди на одну смену волонтёром и запиши, что понравилось", "Найди местную НКО и спроси, какая помощь им нужна"],
      ["Бір ауысымға ерікті болып шығып, не ұнағанын жаз", "Жергілікті ҮЕҰ тауып, қандай көмек керек екенін сұра"],
      ["Do one volunteering shift and write down what you liked", "Find a local NGO and ask what help they need"],
    ),
    realityCheck: {
      activities: l(
        ["Координация волонтёров", "Отчёты для доноров", "Работа с людьми на местах"],
        ["Еріктілерді үйлестіру", "Донорларға есеп", "Жергілікті адамдармен жұмыс"],
        ["Coordinating volunteers", "Reports for donors", "Working with people on the ground"],
      ),
      misconceptions: l(
        ["Это профессиональная работа с планами и цифрами, а не только доброе сердце"],
        ["Бұл тек мейірімді жүрек емес, жоспар мен сандары бар кәсіби жұмыс"],
        ["It is professional work with plans and numbers, not only a kind heart"],
      ),
      entryRoutes: l(
        ["Волонтёрство → координатор → менеджер проектов", "Европейский корпус солидарности и похожие программы"],
        ["Еріктілік → үйлестіруші → жоба менеджері", "Еуропалық ынтымақтастық корпусы және ұқсас бағдарламалар"],
        ["Volunteer → coordinator → project manager", "The European Solidarity Corps and similar programmes"],
      ),
    },
    experimentIds: ["exp-social-impact-shift"],
    adjacent: ["education", "public-policy", "psychology", "environment"],
  },
  {
    id: "media",
    label: t("Медиа и коммуникации", "Медиа және коммуникация", "Media and communications"),
    affinity: { "interests:creative": 1.5, "interests:people": 1.5, "interests:languages-culture": 1.5, "motives:recognition": 1, "motives:freedom": 0.5, "interests:law-politics": 0.5 },
    scales: { C2: "high", C5: "high" },
    why: t(
      "Это направление перекликается с тем, что ты отметил(а): {reasons}. Медиа — это находить истории и рассказывать их так, чтобы их поняли.",
      "Бұл бағыт сен белгілеген нәрселермен үндес: {reasons}. Медиа — оқиғаларды тауып, түсінікті етіп айту.",
      "This direction connects with what you chose: {reasons}. Media is about finding stories and telling them so people understand.",
    ),
    difficulties: l(
      ["Сжатые сроки", "Публичная критика"],
      ["Қысқа мерзімдер", "Көпшілік алдындағы сын"],
      ["Tight deadlines", "Public criticism"],
    ),
    skills: l(
      ["Письмо и редактура", "Интервью", "Проверка фактов"],
      ["Жазу және редакциялау", "Сұхбат алу", "Фактілерді тексеру"],
      ["Writing and editing", "Interviewing", "Fact-checking"],
    ),
    howToTest: l(
      ["Возьми короткое интервью и сделай из него текст или видео", "Веди канал или блог на одну тему две недели"],
      ["Қысқа сұхбат алып, одан мәтін не бейне жаса", "Екі апта бір тақырыпта арна не блог жүргіз"],
      ["Do a short interview and turn it into a text or video", "Run a channel or blog on one topic for two weeks"],
    ),
    realityCheck: {
      activities: l(
        ["Поиск тем и источников", "Съёмка, монтаж или письмо", "Работа с аудиторией"],
        ["Тақырып пен дереккөз іздеу", "Түсіру, монтаж не жазу", "Аудиториямен жұмыс"],
        ["Finding topics and sources", "Filming, editing or writing", "Working with an audience"],
      ),
      misconceptions: l(
        ["Медиа — это не только популярность: большая часть работы — проверка и редактура"],
        ["Медиа — тек танымалдық емес: жұмыстың көбі тексеру мен редакциялау"],
        ["Media is not just popularity: most of the work is checking and editing"],
      ),
      entryRoutes: l(
        ["Портфолио публикаций", "Журналистика, PR, SMM; стажировки в редакциях"],
        ["Жарияланымдар портфолиосы", "Журналистика, PR, SMM; редакцияларда тағылымдама"],
        ["A portfolio of published work", "Journalism, PR, SMM; newsroom internships"],
      ),
    },
    experimentIds: ["exp-media-interview"],
    adjacent: ["design", "international-relations", "education", "sports-management"],
  },
  {
    id: "medicine",
    label: t("Медицина и здоровье", "Медицина және денсаулық", "Medicine and health"),
    affinity: { "interests:health": 3, "interests:science": 1, "interests:people": 1, "motives:impact": 1.5, "motives:stability": 0.5 },
    scales: { C4: "low", C5: "low" },
    why: t(
      "Ты отметил(а): {reasons}. Медицина — это помощь людям через знания о теле и здоровье; разговор с медиком и курс первой помощи покажут, каково это вблизи.",
      "Сен белгіледің: {reasons}. Медицина — дене мен денсаулық туралы білім арқылы адамдарға көмектесу; медикпен әңгіме және алғашқы көмек курсы мұны жақыннан көрсетеді.",
      "You chose: {reasons}. Medicine is helping people through knowledge of the body and health; talking to a medic and a first-aid course will show what it is like up close.",
    ),
    difficulties: l(
      ["Долгое обучение и ординатура", "Ответственность и ночные смены"],
      ["Ұзақ оқу және резидентура", "Жауапкершілік және түнгі ауысымдар"],
      ["Long training and residency", "Responsibility and night shifts"],
    ),
    skills: l(
      ["Биология и химия", "Спокойствие в стрессе", "Общение с пациентами"],
      ["Биология және химия", "Стресте сабырлы болу", "Науқастармен сөйлесу"],
      ["Biology and chemistry", "Staying calm under stress", "Talking with patients"],
    ),
    howToTest: l(
      ["Поговори с врачом, медсестрой или фельдшером о их обычном дне", "Пройди курс первой помощи"],
      ["Дәрігермен, мейірбикемен не фельдшермен олардың әдеттегі күні туралы сөйлес", "Алғашқы көмек курсынан өт"],
      ["Talk to a doctor, nurse or paramedic about their ordinary day", "Take a first-aid course"],
    ),
    realityCheck: {
      activities: l(
        ["Приём пациентов", "Документация", "Постоянное обучение"],
        ["Науқастарды қабылдау", "Құжаттама", "Үздіксіз оқу"],
        ["Seeing patients", "Paperwork", "Continuous learning"],
      ),
      misconceptions: l(
        ["Медицина — это не только врачи: есть общественное здоровье, реабилитация, лабораторная диагностика"],
        ["Медицина — тек дәрігерлер емес: қоғамдық денсаулық, оңалту, зертханалық диагностика бар"],
        ["Medicine is not only doctors: there is public health, rehabilitation, lab diagnostics"],
      ),
      entryRoutes: l(
        ["Медицинский вуз или колледж", "Смежные: общественное здоровье, биотехнологии, психология"],
        ["Медициналық ЖОО не колледж", "Іргелес: қоғамдық денсаулық, биотехнология, психология"],
        ["A medical university or college", "Adjacent: public health, biotech, psychology"],
      ),
    },
    experimentIds: ["exp-medicine-conversation"],
    adjacent: ["psychology", "research", "sports-management", "social-impact"],
  },
  {
    id: "law",
    label: t("Право", "Құқық", "Law"),
    affinity: { "interests:law-politics": 3, "motives:stability": 1, "motives:impact": 1, "interests:people": 0.5 },
    scales: { C3: "high", C4: "low" },
    why: t(
      "Это направление связано с тем, что ты отметил(а): {reasons}. Право — это правила, по которым живёт общество, и умение защищать интересы людей.",
      "Бұл бағыт сен белгілеген нәрселерге байланысты: {reasons}. Құқық — қоғам өмір сүретін ережелер және адамдардың мүддесін қорғай білу.",
      "This direction relates to what you chose: {reasons}. Law is the rules a society lives by and the skill of protecting people's interests.",
    ),
    difficulties: l(
      ["Много точного чтения", "Высокая конкуренция в начале"],
      ["Мұқият оқу көп", "Басында бәсеке жоғары"],
      ["Lots of precise reading", "High competition at the start"],
    ),
    skills: l(
      ["Внимание к деталям", "Аргументация", "Письменная речь"],
      ["Егжей-тегжейге назар", "Дәлелдеу", "Жазбаша сөйлеу"],
      ["Attention to detail", "Argumentation", "Written expression"],
    ),
    howToTest: l(
      ["Разбери один договор (например, пользовательское соглашение) простым языком", "Сходи на открытое судебное заседание"],
      ["Бір шартты (мысалы, пайдаланушы келісімін) қарапайым тілмен талда", "Ашық сот отырысына бар"],
      ["Explain one contract (e.g. terms of service) in plain language", "Attend an open court hearing"],
    ),
    realityCheck: {
      activities: l(
        ["Анализ документов", "Консультации", "Подготовка исков и договоров"],
        ["Құжаттарды талдау", "Кеңес беру", "Талап арыз бен шарт дайындау"],
        ["Analysing documents", "Advising clients", "Drafting claims and contracts"],
      ),
      misconceptions: l(
        ["Работа юриста — это в основном документы, а не речи в суде, как в кино"],
        ["Заңгер жұмысы — көбіне құжаттар, кинодағыдай сотта сөйлеу емес"],
        ["A lawyer's work is mostly documents, not courtroom speeches like in films"],
      ),
      entryRoutes: l(
        ["Юридический факультет", "Юридические клиники при вузах, стажировки в фирмах"],
        ["Заң факультеті", "ЖОО жанындағы заң клиникалары, фирмаларда тағылымдама"],
        ["A law degree", "University legal clinics, internships at firms"],
      ),
    },
    experimentIds: ["exp-law-plain-language"],
    adjacent: ["public-policy", "international-relations", "social-impact", "entrepreneurship"],
  },
  {
    id: "engineering",
    label: t("Инженерия", "Инженерия", "Engineering"),
    affinity: { "interests:tech": 1.5, "interests:science": 1.5, "interests:nature": 0.5, "motives:stability": 1, "motives:curiosity": 1 },
    scales: { C3: "low", C4: "low" },
    why: t(
      "Ты отметил(а): {reasons}. Инженерия — это придумывать и строить то, что работает в реальном мире; даже бумажный мост даёт почувствовать процесс.",
      "Сен белгіледің: {reasons}. Инженерия — нақты әлемде жұмыс істейтін нәрсені ойлап тауып, құрастыру; қағаз көпір де процесті сезінуге мүмкіндік береді.",
      "You chose: {reasons}. Engineering is designing and building things that work in the real world; even a paper bridge lets you feel the process.",
    ),
    difficulties: l(
      ["Много математики и физики", "Ошибки дорого стоят — нужна точность"],
      ["Математика мен физика көп", "Қателік қымбатқа түседі — дәлдік керек"],
      ["Lots of maths and physics", "Mistakes are costly — precision is needed"],
    ),
    skills: l(
      ["Физика и математика", "Черчение и моделирование", "Решение практических задач"],
      ["Физика және математика", "Сызу және модельдеу", "Практикалық есептер шығару"],
      ["Physics and maths", "Drawing and modelling", "Solving practical problems"],
    ),
    howToTest: l(
      ["Построй бумажный мост и испытай его нагрузкой", "Разбери и собери старое устройство, разобравшись, как оно работает"],
      ["Қағаз көпір құрастырып, жүктемемен сына", "Ескі құрылғыны бөлшектеп, қалай жұмыс істейтінін түсініп, қайта жина"],
      ["Build a paper bridge and load-test it", "Take apart and reassemble an old device, working out how it works"],
    ),
    realityCheck: {
      activities: l(
        ["Расчёты и проектирование", "Испытания", "Работа на объектах или производстве"],
        ["Есептеу және жобалау", "Сынақтар", "Нысанда не өндірісте жұмыс"],
        ["Calculations and design", "Testing", "Work on sites or in production"],
      ),
      misconceptions: l(
        ["Инженер не всегда «на заводе»: есть энергетика, робототехника, «зелёные» технологии"],
        ["Инженер әрдайым «зауытта» емес: энергетика, робототехника, «жасыл» технологиялар бар"],
        ["Engineers are not always \"at the factory\": there is energy, robotics, green tech"],
      ),
      entryRoutes: l(
        ["Технический вуз или колледж", "Кружки робототехники, инженерные конкурсы"],
        ["Техникалық ЖОО не колледж", "Робототехника үйірмелері, инженерлік байқаулар"],
        ["A technical university or college", "Robotics clubs, engineering competitions"],
      ),
    },
    experimentIds: ["exp-engineering-paper-bridge"],
    adjacent: ["technology", "environment", "research", "design"],
  },
  {
    id: "sports-management",
    label: t("Спортивный менеджмент и спорт", "Спорт менеджменті және спорт", "Sports management and sport"),
    affinity: { "interests:sport": 3, "interests:business": 1, "interests:people": 1, "motives:recognition": 0.5, "interests:health": 0.5, "decisions:side-project": 0.5 },
    scales: { C1: "high", C2: "high" },
    why: t(
      "Это направление связано с тем, что ты отметил(а): {reasons}. Вокруг спорта много профессий кроме спортсмена: организация, судейство, аналитика, медиа.",
      "Бұл бағыт сен белгілеген нәрселерге байланысты: {reasons}. Спорт айналасында спортшыдан басқа көп мамандық бар: ұйымдастыру, төрешілік, талдау, медиа.",
      "This direction relates to what you chose: {reasons}. Sport has many careers besides athlete: organising, refereeing, analytics, media.",
    ),
    difficulties: l(
      ["Работа в выходные и во время турниров", "Нужно сочетать спорт с бизнесом или аналитикой"],
      ["Демалыс күндері және турнир кезінде жұмыс", "Спортты бизнеспен не талдаумен ұштастыру керек"],
      ["Working weekends and during tournaments", "You need to combine sport with business or analytics"],
    ),
    skills: l(
      ["Организация событий", "Знание правил и регламентов", "Работа с данными о спорте"],
      ["Іс-шара ұйымдастыру", "Ережелер мен регламенттерді білу", "Спорт деректерімен жұмыс"],
      ["Organising events", "Knowing rules and regulations", "Working with sports data"],
    ),
    howToTest: l(
      ["Помоги организовать местный турнир волонтёром", "Возьми интервью у тренера, судьи или менеджера клуба"],
      ["Жергілікті турнирді ұйымдастыруға ерікті ретінде көмектес", "Жаттықтырушыдан, төрешіден не клуб менеджерінен сұхбат ал"],
      ["Help organise a local tournament as a volunteer", "Interview a coach, referee or club manager"],
    ),
    realityCheck: {
      activities: l(
        ["Планирование соревнований", "Работа со спонсорами и командами", "Анализ статистики"],
        ["Жарыстарды жоспарлау", "Демеушілермен және командалармен жұмыс", "Статистиканы талдау"],
        ["Planning competitions", "Working with sponsors and teams", "Analysing statistics"],
      ),
      misconceptions: l(
        ["Не нужно быть профессиональным спортсменом, чтобы строить карьеру в спорте"],
        ["Спортта мансап құру үшін кәсіби спортшы болу міндетті емес"],
        ["You do not need to be a pro athlete to build a career in sport"],
      ),
      entryRoutes: l(
        ["Спортивный менеджмент, экономика, журналистика", "Волонтёрство на соревнованиях, судейские курсы"],
        ["Спорт менеджменті, экономика, журналистика", "Жарыстарда еріктілік, төрешілер курсы"],
        ["Sports management, economics, journalism", "Volunteering at competitions, referee courses"],
      ),
    },
    experimentIds: ["exp-entrepreneurship-test", "exp-media-interview"],
    adjacent: ["entrepreneurship", "media", "data-ml", "medicine"],
  },
  {
    id: "environment",
    label: t("Экология и устойчивое развитие", "Экология және тұрақты даму", "Environment and sustainability"),
    affinity: { "interests:nature": 3, "interests:science": 1, "interests:social-impact": 1, "motives:impact": 1.5 },
    scales: { C5: "high" },
    why: t(
      "Ты отметил(а): {reasons}. Экология соединяет науку, технологии и работу с людьми; экоаудит одного места — хороший первый шаг.",
      "Сен белгіледің: {reasons}. Экология ғылымды, технологияны және адамдармен жұмысты біріктіреді; бір жердің экоаудиті — жақсы алғашқы қадам.",
      "You chose: {reasons}. Environmental work combines science, technology and working with people; an eco-audit of one place is a good first step.",
    ),
    difficulties: l(
      ["Результаты видны не сразу", "Много бюрократии в проектах"],
      ["Нәтиже бірден көрінбейді", "Жобаларда бюрократия көп"],
      ["Results take time to show", "Lots of paperwork in projects"],
    ),
    skills: l(
      ["Естественные науки", "Работа с данными", "Коммуникация с сообществом"],
      ["Жаратылыстану ғылымдары", "Деректермен жұмыс", "Қауымдастықпен коммуникация"],
      ["Natural sciences", "Working with data", "Communicating with communities"],
    ),
    howToTest: l(
      ["Проведи экоаудит своего дома, школы или офиса за неделю", "Присоединись к экологической акции в городе"],
      ["Бір апта ішінде үйіңнің, мектебіңнің не кеңсеңнің экоаудитін жүргіз", "Қаладағы экологиялық акцияға қосыл"],
      ["Run a one-week eco-audit of your home, school or office", "Join an environmental action in your city"],
    ),
    realityCheck: {
      activities: l(
        ["Замеры и наблюдения", "Отчёты и проекты", "Просветительская работа"],
        ["Өлшеу және бақылау", "Есептер мен жобалар", "Ағартушылық жұмыс"],
        ["Measurements and observation", "Reports and projects", "Public education"],
      ),
      misconceptions: l(
        ["Это не только активизм: есть инженеры, аналитики, специалисты по ESG в компаниях"],
        ["Бұл тек белсенділік емес: компанияларда инженерлер, талдаушылар, ESG мамандары бар"],
        ["It is not only activism: companies hire engineers, analysts and ESG specialists"],
      ),
      entryRoutes: l(
        ["Экология, биология, география, инженерия", "Волонтёрство в экологических НКО"],
        ["Экология, биология, география, инженерия", "Экологиялық ҮЕҰ-да еріктілік"],
        ["Ecology, biology, geography, engineering", "Volunteering with environmental NGOs"],
      ),
    },
    experimentIds: ["exp-environment-audit"],
    adjacent: ["research", "engineering", "social-impact", "public-policy"],
  },
];

export function getDirection(id: string): DirectionEntry | undefined {
  return DIRECTION_CATALOGUE.find((d) => d.id === id);
}
