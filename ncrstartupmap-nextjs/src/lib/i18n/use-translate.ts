import { useCallback } from "react";
import { SupportedLocale } from "./config";

interface Translations {
  [key: string]: string;
}

const translations: Record<SupportedLocale, Translations> = {
  en: {
    "dashboard.title": "NCR Startup Map",
    "dashboard.submit": "Submit a Startup",
    "filter.area": "Area",
    "filter.sector": "Sector",
    "filter.stage": "Stage",
    "view.map": "Map",
    "view.grid": "Grid",
    "view.unmapped": "Unmapped",
    loading: "Loading...",
    error: "An error occurred",
    hiring: "Hiring",
    "not-hiring": "Not Hiring",
    unconfirmed: "Unconfirmed",
  },
  zh: {
    "dashboard.title": "NCR 初创地图",
    "dashboard.submit": "提交初创",
    "filter.area": "区域",
    "filter.sector": "行业",
    "filter.stage": "阶段",
    "view.map": "地图",
    "view.grid": "网格",
    "view.unmapped": "未映射",
    loading: "加载中...",
    error: "发生错误",
    hiring: "招聘中",
    "not-hiring": "不招聘",
    unconfirmed: "未确认",
  },
};

export function useTranslate(locale: SupportedLocale = "en") {
  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] || key;
    },
    [locale],
  );
  return t;
}
