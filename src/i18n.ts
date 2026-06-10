import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import th from "./locales/th.json";

const savedLang = (() => {
  try { return localStorage.getItem("finora-lang") ?? "en"; }
  catch { return "en"; }
})();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    th: { translation: th },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
