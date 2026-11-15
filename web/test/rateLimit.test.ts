import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/lib/server/rateLimit";

describe("RateLimiter", () => {
  it("never limits a realistic tagging run (2 lookups/s for 10 minutes)", () => {
    const rl = new RateLimiter(300, 60_000);
    let t = 0;
    for (let i = 0; i < 1200; i++, t += 500) expect(rl.check("me", t)).toBe(0);
  });
  it("limits a burst and says when to retry", () => {
    const rl = new RateLimiter(300, 60_000);
    for (let i = 0; i < 300; i++) rl.check("bot", 1000 + i);
    const retry = rl.check("bot", 2000);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(60);
    expect(rl.check("someone-else", 2000)).toBe(0);
  });
  it("frees the slot once the window passes", () => {
    const rl = new RateLimiter(2, 1000);
    rl.check("a", 0);
    rl.check("a", 10);
    expect(rl.check("a", 20)).toBeGreaterThan(0);
    expect(rl.check("a", 1011)).toBe(0);
  });
  it("caps memory", () => {
    const rl = new RateLimiter(5, 60_000, 100);
    for (let i = 0; i < 1000; i++) rl.check(`ip${i}`, i);
    // @ts-expect-error private access for the test
    expect(rl.hits.size).toBeLessThanOrEqual(100);
  });
});
