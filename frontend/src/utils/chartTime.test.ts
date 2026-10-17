import { describe, expect, it } from "vitest";
import { toChartTime } from "./chartTime";

describe("toChartTime", () => {
  it("passes daily date strings through unchanged", () => {
    expect(toChartTime("2026-10-01")).toBe("2026-10-01");
  });

  it("converts intraday datetime strings to a UTC timestamp", () => {
    expect(toChartTime("2026-10-01 09:30:00")).toBe(
      Math.floor(Date.parse("2026-10-01T09:30:00Z") / 1000),
    );
  });
});
