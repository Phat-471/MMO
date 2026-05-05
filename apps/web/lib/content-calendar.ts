export type SchedulePreset = "immediate" | "daily_morning" | "daily_evening" | "weekdays_morning" | "weekends_morning";

export function buildScheduleCronFromPreset(preset: SchedulePreset): string {
  switch (preset) {
    case "immediate":
      return "";
    case "daily_morning":
      return "0 8 * * *";
    case "daily_evening":
      return "0 18 * * *";
    case "weekdays_morning":
      return "0 9 * * 1-5";
    case "weekends_morning":
      return "0 10 * * 6,0";
    default:
      return "";
  }
}

export function formatSchedulePreset(preset: SchedulePreset): string {
  switch (preset) {
    case "immediate":
      return "Chay ngay";
    case "daily_morning":
      return "Moi sang 8h";
    case "daily_evening":
      return "Moi toi 18h";
    case "weekdays_morning":
      return "Ngay trong tuan 9h";
    case "weekends_morning":
      return "Cuoi tuan 10h";
    default:
      return preset;
  }
}
