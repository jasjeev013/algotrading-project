import type { Time } from "lightweight-charts";

// lightweight-charts' string path only accepts business-day dates
// ("yyyy-mm-dd"); it throws on any string with a time-of-day component.
// Intraday rows from the backend come as "yyyy-mm-dd HH:MM:SS", so those
// must be converted to a UTCTimestamp (seconds) instead.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const toChartTime = (time: string): Time => {
  if (DATE_ONLY.test(time)) {
    return time as unknown as Time;
  }
  const ms = Date.parse(`${time.replace(" ", "T")}Z`);
  return (Number.isNaN(ms) ? 0 : Math.floor(ms / 1000)) as unknown as Time;
};
