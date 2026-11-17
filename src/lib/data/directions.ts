import type { LocalizedText } from "./types";

/** Directions that experiments belong to (`Experiment.direction`). */
export const DIRECTIONS = [
  "diplomacy",
  "entrepreneurship",
  "psychology",
  "programming",
  "design",
  "education",
  "media",
  "research",
  "social-impact",
  "medicine",
  "law",
  "engineering",
  "data-ml",
  "environment",
] as const;
export type DirectionSlug = (typeof DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<DirectionSlug, LocalizedText> = {
  diplomacy: { ru: "Дипломатия и международные отношения", kk: "Дипломатия және халықаралық қатынастар", en: "Diplomacy and international relations" },
  entrepreneurship: { ru: "Предпринимательство", kk: "Кәсіпкерлік", en: "Entrepreneurship" },
  psychology: { ru: "Психология", kk: "Психология", en: "Psychology" },
  programming: { ru: "Программирование", kk: "Бағдарламалау", en: "Programming" },
  design: { ru: "Дизайн", kk: "Дизайн", en: "Design" },
  education: { ru: "Образование и преподавание", kk: "Білім беру және оқыту", en: "Education and teaching" },
  media: { ru: "Медиа и журналистика", kk: "Медиа және журналистика", en: "Media and journalism" },
  research: { ru: "Наука и исследования", kk: "Ғылым және зерттеу", en: "Science and research" },
  "social-impact": { ru: "Социальное влияние", kk: "Әлеуметтік әсер", en: "Social impact" },
  medicine: { ru: "Медицина", kk: "Медицина", en: "Medicine" },
  law: { ru: "Право", kk: "Құқық", en: "Law" },
  engineering: { ru: "Инженерия", kk: "Инженерия", en: "Engineering" },
  "data-ml": { ru: "Данные и машинное обучение", kk: "Деректер және машиналық оқыту", en: "Data and machine learning" },
  environment: { ru: "Экология и устойчивое развитие", kk: "Экология және тұрақты даму", en: "Environment and sustainability" },
};
