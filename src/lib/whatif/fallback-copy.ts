import type { LocalizedText } from "@/lib/data/types";

const t = (ru: string, kk: string, en: string): LocalizedText => ({ ru, kk, en });

/** Plain wording of the rule-based scenario. {placeholders} are filled by `fill`. Hypotheses, never promises. */
export const SCENARIO_COPY = {
  // week 1
  w1Learn: t(
    "Узнай, как выглядит обычный рабочий день в этой сфере: {activity}",
    "Осы саладағы қарапайым жұмыс күні қандай болатынын біл: {activity}",
    "Find out what an ordinary working day in this field looks like: {activity}",
  ),
  w1Read: t(
    "Найди два честных рассказа людей из этой сферы (не рекламу) и выпиши, что тебя удивило.",
    "Осы саладағы адамдардың екі шынайы әңгімесін тап (жарнаманы емес) және не таңқалдырғанын жаз.",
    "Find two honest accounts by people in this field (not advertising) and note what surprised you.",
  ),
  w1Checkpoint: t(
    "Похож ли реальный рабочий день на то, как я его себе представлял(а)?",
    "Нақты жұмыс күні мен елестеткендей ме?",
    "Does the real working day look like what I imagined?",
  ),
  // week 2
  w2Test: t("Сделай первую маленькую проверку: {test}", "Алғашқы шағын тексеруді жаса: {test}", "Run the first small test: {test}"),
  w2Time: t(
    "Мало времени: выбери один-два часа в неделю и сразу запиши их в расписание.",
    "Уақыт аз: аптасына бір-екі сағат таңдап, оны бірден кестеге жаз.",
    "Not much time: pick one or two hours a week and put them in your calendar right away.",
  ),
  w2Checkpoint: t(
    "Мне нравится сам процесс или только идея этим заниматься?",
    "Маған үдерістің өзі ұнай ма, әлде тек осымен айналысу идеясы ма?",
    "Do I enjoy the process itself, or only the idea of doing it?",
  ),
  // week 3
  w3Practice: t("Потренируй один навык: {skill}", "Бір дағдыны жаттықтыр: {skill}", "Practise one skill: {skill}"),
  w3Repeat: t(
    "Повтори проверку на другом материале или в другом формате, чтобы увидеть, что осталось неизменным.",
    "Тексеруді басқа материалмен не басқа форматта қайтала — не өзгеріссіз қалғанын көру үшін.",
    "Repeat the test with different material or in a different format to see what stays the same.",
  ),
  w3Dip: t(
    "Интерес часто проседает на третьей неделе — это нормально. Сделай шаг меньше, но не бросай совсем.",
    "Қызығушылық үшінші аптада жиі бәсеңдейді — бұл қалыпты. Қадамды кішірейт, бірақ мүлде тастама.",
    "Interest often dips in week three, and that is normal. Make the step smaller, but do not drop it completely.",
  ),
  w3Checkpoint: t("Что удивило меня больше всего?", "Мені не көбірек таңғалдырды?", "What surprised me the most?"),
  // week 4
  w4Journal: t(
    "Запиши в дневник: что ты пробовал(а), что узнал(а), что не понравилось.",
    "Күнделікке жаз: не байқап көрдің, не білдің, не ұнамады.",
    "Write in your journal: what you tried, what you learned, what you did not like.",
  ),
  w4Questions: t(
    "Заранее подготовь три коротких вопроса: что в работе самое неожиданное, что самое трудное, с чего человек начинал.",
    "Алдын ала үш қысқа сұрақ дайында: жұмыста не ең күтпеген, не ең қиын, адам неден бастады.",
    "Prepare three short questions in advance: what is most unexpected in the work, what is hardest, how the person started.",
  ),
  w4Person: t(
    "Человек, который работает в этой сфере (найди через преподавателей, знакомых или студенческие сообщества).",
    "Осы салада жұмыс істейтін адам (оқытушылар, таныстар не студенттік қауымдастықтар арқылы тап).",
    "Someone who works in this field (find them through teachers, acquaintances or student communities).",
  ),
  w4Recent: t(
    "Тот, кто начал недавно: он лучше помнит первые шаги.",
    "Жақында бастаған адам: ол алғашқы қадамдарды жақсы есіне алады.",
    "Someone who started recently: they remember the first steps better.",
  ),
  w4Awkward: t(
    "Неловко писать незнакомому человеку. Короткое вежливое сообщение с одним вопросом обычно проще, чем кажется.",
    "Бейтаныс адамға жазу ыңғайсыз. Бір сұрақты қысқа сыпайы хабарлама көбіне көрінгеннен оңай.",
    "Writing to a stranger feels awkward. A short, polite message with one question is usually easier than it seems.",
  ),
  w4Checkpoint: t(
    "Хочу ли я исследовать это направление ещё два месяца?",
    "Мен бұл бағытты тағы екі ай зерттегім келе ме?",
    "Do I want to keep exploring this direction for two more months?",
  ),
  // month 2
  m2Task: t(
    "Возьми небольшую настоящую задачу и примени навыки: {skills}.",
    "Шағын нақты міндет алып, дағдыларды қолдан: {skills}.",
    "Take a small real task and use these skills: {skills}.",
  ),
  m2Repeat: t(
    "Повтори тот тест, который понравился больше всего, но сделай его чуть сложнее.",
    "Ең ұнаған тестті қайтала, бірақ сәл күрделірек жаса.",
    "Repeat the test you liked most, but make it a little harder.",
  ),
  m2Mentor: t(
    "Человек на 2–3 года впереди тебя, с кем можно сверять шаги (преподаватель, старшекурсник, практик).",
    "Сенен 2–3 жыл алда адам, қадамдарыңды онымен салыстыруға болады (оқытушы, жоғары курс студенті, практик).",
    "Someone two or three years ahead of you to check your steps with (a teacher, an older student, a practitioner).",
  ),
  m2Hard: t(
    "Когда новизна проходит, становится заметнее рутина. Это не знак остановиться, а то, что стоит заметить.",
    "Жаңалық өткенде күнделікті жұмыс анығырақ көрінеді. Бұл тоқтау белгісі емес, назар аударатын нәрсе.",
    "Once the novelty fades, the routine becomes more visible. That is not a sign to stop, just something to notice.",
  ),
  m2Checkpoint: t(
    "Хочется ли мне углубляться, когда это уже не новинка?",
    "Бұл жаңалық болмай қалғанда да тереңдей түскім келе ме?",
    "Do I still want to go deeper now that it is no longer new?",
  ),
  // month 3
  m3Route: t(
    "Посмотри, как сюда обычно приходят: {route}. Условия проверь на официальных сайтах.",
    "Бұл салаға әдетте қалай келетінін қара: {route}. Шарттарды ресми сайттардан тексер.",
    "See how people usually get into this field: {route}. Check the conditions on the official sites.",
  ),
  m3Compare: t(
    "Сравни это направление с одним-двумя другими из своего отчёта: что в них лучше, что хуже.",
    "Бұл бағытты есебіңдегі бір-екі басқа бағытпен салыстыр: оларда не жақсы, не нашар.",
    "Compare this direction with one or two others from your report: what is better and worse in them.",
  ),
  m3Neighbour: t(
    "Один небольшой тест из соседнего направления: {title}",
    "Көрші бағыттан бір шағын тест: {title}",
    "One small test from a neighbouring direction: {title}",
  ),
  m3Person: t(
    "Человек из соседней сферы, чтобы сравнить впечатления.",
    "Әсерлерді салыстыру үшін көрші саладағы адам.",
    "Someone from a neighbouring field to compare impressions with.",
  ),
  m3Fear: t(
    "Страх «потерять время». Любая проверка тоже даёт информацию, даже если вывод «это не моё».",
    "«Уақытты жоғалтып аламын» деген қорқыныш. Кез келген тексеру ақпарат береді, тіпті қорытынды «бұл менікі емес» болса да.",
    "Fear of wasting time. Every test gives information, even when the answer is “this is not for me”.",
  ),
  m3Checkpoint: t(
    "Какой следующий шаг подходит мне сейчас: продолжить, скорректировать или попробовать другое направление?",
    "Қазір маған қай келесі қадам сәйкес: жалғастыру, түзету не басқа бағытты байқап көру?",
    "Which next step suits me now: continue, adjust, or try another direction?",
  ),
  // generic stand-ins when a direction has no own data
  genericActivity: t("почитай описание профессии и вакансий", "мамандық пен вакансиялардың сипаттамасын оқы", "read job descriptions and listings"),
  genericTest: t(
    "выбери самое маленькое дело из этой сферы и сделай его за вечер",
    "осы саладан ең кішкентай істі таңдап, бір кеште орында",
    "pick the smallest task from this field and do it in one evening",
  ),
  genericSkill: t("то, что чаще всего просят в этой сфере", "осы салада жиі сұралатын нәрсе", "what is most often asked for in this field"),
  genericDifficulty: t(
    "Новое направление требует времени и терпения. Начни с малого.",
    "Жаңа бағыт уақыт пен шыдамдылықты қажет етеді. Кішіден баста.",
    "A new direction takes time and patience. Start small.",
  ),
  genericRoute: t(
    "учебные программы, стажировки и практика (проверь их на официальных сайтах)",
    "оқу бағдарламалары, тағылымдамалар және практика (ресми сайттардан тексер)",
    "study programmes, internships and practice (check them on official sites)",
  ),
} as const satisfies Record<string, LocalizedText>;

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
