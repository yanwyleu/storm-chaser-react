import { describe, it, expect } from "vitest";
import { severityFrom } from "@/lib/storms";
describe("severityFrom", () => {
  it("calm for light weather", () => expect(severityFrom(20, 0, 1)).toBe("calm"));
  it("watch at 50 km/h gusts", () => expect(severityFrom(50, 0, 3)).toBe("watch"));
  it("warning for thunderstorm", () => expect(severityFrom(30, 0, 95)).toBe("warning"));
  it("severe at 90 km/h gusts", () => expect(severityFrom(90, 0, 3)).toBe("severe"));
  it("extreme at hurricane-force gusts", () => expect(severityFrom(120, 0, 3)).toBe("extreme"));
});
