// Practice-mode booking flow: the same rules the live flow will follow.
// Two sides, one state machine — the patron's codes and the artist's screens.

export const ARRIVAL_CODE = "2390";
export const CLOSING_CODE = "4817";

export type Stage =
  | "requested"
  | "accepted"
  | "arrived"
  | "checked_in"
  | "show_on"
  | "show_done"
  | "released"
  | "declined";

export type FlowState = {
  stage: Stage;
  arrivalOk: boolean;
  videoOk: boolean;
  closingOk: boolean;
  message: string;
  error: string | null;
};

export function initialFlow(): FlowState {
  return {
    stage: "requested",
    arrivalOk: false,
    videoOk: false,
    closingOk: false,
    message: "The request is with the artist. Their answer decides what happens to the money.",
    error: null,
  };
}

export function accept(s: FlowState): FlowState {
  if (s.stage !== "requested") return s;
  return { ...s, stage: "accepted", error: null, message: "Accepted. The fee stays with Kalzo until both sides confirm the show." };
}

export function decline(s: FlowState): FlowState {
  if (s.stage !== "requested") return s;
  return { ...s, stage: "declined", error: null, message: "Declined — the full amount goes straight back to the patron and new artists are suggested." };
}

export function markArrived(s: FlowState): FlowState {
  if (s.stage !== "accepted") return s;
  return { ...s, stage: "arrived", error: null, message: "At the venue. Ask the patron for the arrival code." };
}

/** The patron's arrival code unlocks the check-in step. A wrong code changes nothing. */
export function enterArrival(s: FlowState, code: string): FlowState {
  if (s.stage !== "arrived") return s;
  if (code !== ARRIVAL_CODE) return { ...s, error: "That arrival code doesn't match. Ask the patron to read it again." };
  return { ...s, arrivalOk: true, error: null, message: "Arrival code confirmed. Record the live check-in video now." };
}

export function recordVideo(s: FlowState): FlowState {
  if (!s.arrivalOk || s.stage !== "arrived") {
    return { ...s, error: "The check-in video can only be recorded after the arrival code is confirmed." };
  }
  return { ...s, videoOk: true, stage: "checked_in", error: null, message: "Live check-in video saved as proof of arrival." };
}

export function startShow(s: FlowState): FlowState {
  if (s.stage !== "checked_in") return s;
  return { ...s, stage: "show_on", error: null, message: "The show is on." };
}

export function endShow(s: FlowState): FlowState {
  if (s.stage !== "show_on") return s;
  return { ...s, stage: "show_done", error: null, message: "Show over. Ask the patron for the closing code." };
}

/** Money is released only when the arrival code, the video and the closing code are all in. */
export function enterClosing(s: FlowState, code: string): FlowState {
  if (s.stage !== "show_done") return s;
  if (code !== CLOSING_CODE) return { ...s, error: "That closing code doesn't match. Ask the patron to read it again." };
  if (!s.arrivalOk || !s.videoOk) return { ...s, error: "Arrival code and check-in video are both required before payment is released." };
  return { ...s, closingOk: true, stage: "released", error: null, message: "Both sides confirmed. The fee reaches the artist within 48 hours." };
}

export function isReleased(s: FlowState): boolean {
  return s.stage === "released" && s.arrivalOk && s.videoOk && s.closingOk;
}

export function isRefunded(s: FlowState): boolean {
  return s.stage === "declined";
}

/** Which code the patron should be showing right now: null = nothing to share yet. */
export function patronCodeToShow(s: FlowState): "arrival" | "closing" | "none" {
  if (s.stage === "declined" || s.stage === "requested" || s.stage === "accepted") return "none";
  if (s.stage === "arrived") return "arrival";
  if (s.stage === "show_done") return "closing";
  return "none";
}
