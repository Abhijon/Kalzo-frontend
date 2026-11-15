import { describe, expect, it } from "vitest";
import {
  ARRIVAL_CODE,
  CLOSING_CODE,
  accept,
  decline,
  endShow,
  enterArrival,
  enterClosing,
  initialFlow,
  isRefunded,
  isReleased,
  markArrived,
  patronCodeToShow,
  recordVideo,
  startShow,
} from "./bookingFlow";
import { bookingMoney } from "./fees";

const clean = () =>
  enterClosing(endShow(startShow(recordVideo(enterArrival(markArrived(accept(initialFlow())), ARRIVAL_CODE)))), CLOSING_CODE);

describe("practice booking codes", () => {
  it("uses the same two codes the patron side shows", () => {
    expect(ARRIVAL_CODE).toBe("2390");
    expect(CLOSING_CODE).toBe("4817");
  });

  it("releases money only after arrival code, video and closing code", () => {
    const s = clean();
    expect(isReleased(s)).toBe(true);
    expect(s.stage).toBe("released");
  });

  it("a wrong arrival code changes nothing", () => {
    const s = enterArrival(markArrived(accept(initialFlow())), "0000");
    expect(s.arrivalOk).toBe(false);
    expect(s.stage).toBe("arrived");
    expect(s.error).toContain("doesn't match");
  });

  it("no check-in video before the arrival code is accepted", () => {
    const s = recordVideo(markArrived(accept(initialFlow())));
    expect(s.videoOk).toBe(false);
    expect(s.stage).toBe("arrived");
    expect(s.error).toContain("arrival code");
  });

  it("no closing code before the show has ended", () => {
    const s = enterClosing(markArrived(accept(initialFlow())), CLOSING_CODE);
    expect(s.stage).toBe("arrived");
    expect(isReleased(s)).toBe(false);
  });

  it("declining refunds the patron in full and never pays out", () => {
    const s = decline(initialFlow());
    expect(isRefunded(s)).toBe(true);
    expect(isReleased(s)).toBe(false);
    expect(s.message).toContain("back to the patron");
  });

  it("the patron shows the arrival code on arrival and the closing code after the show", () => {
    expect(patronCodeToShow(accept(initialFlow()))).toBe("none");
    expect(patronCodeToShow(markArrived(accept(initialFlow())))).toBe("arrival");
    expect(patronCodeToShow(endShow(startShow(recordVideo(enterArrival(markArrived(accept(initialFlow())), ARRIVAL_CODE)))))).toBe("closing");
  });

  it("the released amount is the fee-cut figure from the shared formula", () => {
    const money = bookingMoney(10500, 3500);
    expect(money.fee).toBe(199);
    expect(money.net).toBe(10301);
    expect(money.advance).toBe(2625);
    expect(isReleased(clean())).toBe(true);
  });
});
