import { Lunar } from "lunar-javascript";

const shortMonths = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];

export type LunarInfo = {
  full: string;
  short: string;
};

export function getLunarDate(date: Date): LunarInfo {
  try {
    const lunar = Lunar.fromDate(date);
    const month = lunar.getMonth();
    const day = lunar.getDay();
    const monthName = lunar.getMonthInChinese();
    const dayName = lunar.getDayInChinese();
    const isLeap = month < 0;
    const absMonth = Math.abs(month);
    const prefix = isLeap ? "闰" : "";
    return {
      full: `农历${prefix}${monthName}月${dayName}`,
      short: day === 1 ? `${prefix}${shortMonths[absMonth]}月` : dayName
    };
  } catch {
    return {
      full: "农历--",
      short: "农历--"
    };
  }
}
