// Minimal stand-in for the design runtime's base class; setState triggers React re-render.
export class DCLogic {
  constructor(props) { this.props = props; this.state = {}; this._notify = null; }
  setState(patch) {
    this.state = Object.assign({}, this.state, typeof patch === "function" ? patch(this.state) : patch);
    if (this._notify) this._notify();
  }
}
