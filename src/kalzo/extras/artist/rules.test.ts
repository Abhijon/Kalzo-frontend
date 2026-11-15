import { describe, expect, it } from "vitest";
import { advanceFor, balanceFor, walletTotals } from "./rules";
describe("artist panel rules", () => {
  it("advance is 25% of the booking", () => {
    expect(advanceFor(10000)).toBe(2500);
    expect(balanceFor(10000)).toBe(7500);
  });
  it("wallet totals split pending and released", () => {
    expect(
      walletTotals([
        { amount_inr: 2500, status: "released", kind: "advance" },
        { amount_inr: 7500, status: "pending", kind: "balance" },
      ]),
    ).toEqual({ total: 10000, pending: 7500, released: 2500, available: 0, held: 0 });
  });
  it("counts available and held balances without calling them settled", () => {
    expect(walletTotals([{amount_inr: 1000, status: "available", kind: "advance"}, {amount_inr: 400, status: "on_hold", kind: "balance"}])).toEqual({total: 1400, available: 1000, held: 400, pending: 0, released: 0});
  });
});
