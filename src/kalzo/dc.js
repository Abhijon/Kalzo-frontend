// Minimal stand-in for the design runtime's base class; setState triggers React re-render.
let lastHomeScrollY = 0;

export class DCLogic {
  constructor(props) {
    this.props = props;
    this.state = {};
    this._notify = null;
  }
  setState(patch) {
    const prevScreen = this.state.screen;
    const nextState = typeof patch === "function" ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, nextState);
    if (this._notify) this._notify();
    if (typeof window !== "undefined" && nextState && nextState.screen && nextState.screen !== prevScreen) {
      if (prevScreen === "home") {
        lastHomeScrollY = window.scrollY || window.pageYOffset || 0;
      }
      if (nextState.screen === "profile" || nextState.screen === "book" || nextState.screen === "pay") {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => window.scrollTo(0, 0));
      } else if (nextState.screen === "home" && lastHomeScrollY) {
        requestAnimationFrame(() => window.scrollTo(0, lastHomeScrollY));
      }
    }
  }
}
