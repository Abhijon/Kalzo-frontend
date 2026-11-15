import { useServerFn } from "@tanstack/react-start";
import { publicArtists } from "@/lib/artists.functions";
import { MoneyPath } from "./extras/MoneyPath";
import { Fragment, createElement, useEffect, useReducer, useRef, type ReactNode } from "react";
// @ts-expect-error plain JS module
import { KalzoLogic } from "./logic.js";
import template from "./template.json";
import "./kalzo.css";
import { KalzoTalk, KalzoFees, type FlowInfo } from "./extras/Extras";
import { PatronGate } from "./extras/PatronGate";
import { startRazorpay } from "./extras/razorpay";
import { BrandMark, HouseCounter, KalzoWord } from "./extras/BrandMark";
import { SavedList, type SavedItem } from "./extras/SavedList";
import { BookingRoom } from "./extras/BookingRoom";
import { api } from "@/lib/api";
import { ArtistContact } from "./extras/ArtistContact";
import { useState } from "react";
import { ProfileEntry } from "./extras/ProfileEntry";

type Node = string | { t: string; a: Record<string, string>; c: Node[] };
type Scope = Record<string, unknown>;

const EXPR = /\{\{\s*([\w.$]+)\s*\}\}/g;
const ONLY = /^\{\{\s*([\w.$]+)\s*\}\}$/;

function get(scope: Scope, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as Scope)[k]), scope);
}
function val(raw: string, scope: Scope): unknown {
  const m = raw.trim().match(ONLY);
  if (m) return get(scope, m[1] ?? "");
  return raw.replace(EXPR, (_, p) => {
    const v = get(scope, p);
    return v == null ? "" : String(v);
  });
}
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function styleObj(s: string) {
  const o: Record<string, string> = {};
  // split on ; not inside parentheses
  let depth = 0,
    cur = "";
  const parts: string[] = [];
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  for (const p of parts) {
    const i = p.indexOf(":");
    if (i < 0) continue;
    const k = p.slice(0, i).trim();
    if (!k) continue;
    o[
      k.startsWith("--")
        ? k
        : camel(k.replace(/^-webkit-/, "Webkit-").replace(/^Webkit-/, "webkit-"))
    ] = p.slice(i + 1).trim();
  }
  return o;
}
const SKIP = new Set(["hint-placeholder-val", "hint-placeholder-count"]);

function render(n: Node, scope: Scope, key: string | number): ReactNode {
  if (typeof n === "string") {
    const v = val(n, scope);
    return v == null || typeof v === "boolean" ? null : (v as ReactNode);
  }
  if (n.t === "kalzo-contact")
    return <ArtistContact key={key} artist={String(scope["selectedArtistId"] ?? "")} />;
  if (n.t === "kalzo-profile-entry") return <ProfileEntry key={key} />;
  if (n.t === "kalzo-patron")
    return <PatronGate key={key} onBack={scope["flowBack"] as () => void} />;
  if (n.t === "kalzo-moneypath") return <MoneyPath key={key} />;
  if (n.t === "kalzo-talk") return <KalzoTalk key={key} info={scope["flowInfo"] as FlowInfo} />;
  if (n.t === "kalzo-fees") return <KalzoFees key={key} info={scope["flowInfo"] as FlowInfo} />;
  if (n.t === "kalzo-brand") return <BrandMark key={key} onHome={scope["goHome"] as () => void} />;
  if (n.t === "kalzo-counter")
    return (
      <HouseCounter
        key={key}
        start={Number(String(scope["houseTotal"] ?? "3230").replace(/,/g, ""))}
      />
    );
  if (n.t === "kalzo-word")
    return <KalzoWord key={key} size={n.a["size"] ?? "1em"} tone={n.a["tone"] ?? "bronze"} />;
  if (n.t === "kalzo-saved")
    return <SavedList key={key} items={(scope["savedItems"] as SavedItem[]) ?? []} />;
  if (n.t === "kalzo-bookingroom") return <BookingRoom key={key} />;
  const kids = (s: Scope) => n.c.map((c, i) => render(c, s, i));
  if (n.t === "sc-if")
    return val(n.a["value"] ?? "", scope) ? <Fragment key={key}>{kids(scope)}</Fragment> : null;
  if (n.t === "sc-for") {
    const list = (val(n.a["list"] ?? "", scope) as unknown[]) || [];
    const as = String(n.a["as"]);
    return list.map((item, i) => (
      <Fragment key={`${key}-${i}`}>{kids({ ...scope, [as]: item, index: i })}</Fragment>
    ));
  }
  const tag = n.t === "sc-raw-select" ? "select" : n.t;
  const props: Record<string, unknown> = { key };
  for (const [k, raw] of Object.entries(n.a)) {
    if (SKIP.has(k)) continue;
    let v = val(raw, scope);
    let name = k;
    if (k.startsWith("sc-camel-")) name = camel(k.slice(9));
    else if (k === "class") name = "className";
    else if (k === "for") name = "htmlFor";
    else if (k === "style") {
      v = styleObj(String(v ?? ""));
    } else if (k === "href" && String(v).endsWith(".html")) v = "#finder";
    else if (k.startsWith("aria-") || k.startsWith("data-")) {
      if (typeof v === "boolean") v = String(v);
    } else if (k.includes("-")) name = camel(k);
    else if (k === "tabindex") name = "tabIndex";
    else if (k === "maxlength") name = "maxLength";
    else if (k === "autocomplete") name = "autoComplete";
    else if (k === "inputmode") name = "inputMode";
    else if (k === "readonly") name = "readOnly";
    else if (k === "viewbox") name = "viewBox";
    props[name] = v;
  }
  if (
    (tag === "input" || tag === "select" || tag === "textarea") &&
    "value" in props &&
    !props["onChange"]
  )
    props["readOnly"] = true;
  if (tag === "select" && !props["onChange"]) props["onChange"] = () => {};
  if (tag === "input" || n.c.length === 0) return createElement(tag, props);
  return createElement(tag, props, ...kids(scope));
}

export function Kalzo() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const ref = useRef<InstanceType<typeof KalzoLogic> | null>(null);
  if (!ref.current) ref.current = new KalzoLogic({});
  ref.current._notify = force;
  const readArtists = useServerFn(publicArtists);
  useEffect(() => {
    readArtists()
      .then((artists) => {
        if (ref.current) {
          ref.current.publicArtists = artists;
          force();
        }
      })
      .catch(() => {});
  }, [readArtists]);
  useEffect(() => startRazorpay(), []);
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    api.auth.getUser().then(({ data }) => setSigned(!!data?.user));
    const { data } = api.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  const vals = ref.current.renderVals() as Scope;
  if (
    !signed &&
    (vals["isProfile"] || vals["isBook"] || vals["isPay"]) &&
    !vals["selectedIsSample"]
  )
    return (
      <main className="kl-account">
        <PatronGate
          onBack={() => {
            ref.current?.setState({ screen: "home" });
          }}
        />
      </main>
    );
  return <>{(template as Node[]).map((n, i) => render(n, vals, i))}</>;
}

/** Share the original imported welcome artwork across artist entry screens. */
export function ArtistWelcome() {
  function find(nodes: Node[]): Node | undefined {
    for (const node of nodes) {
      if (typeof node === "string") continue;
      if (node.t === "section" && node.a["aria-label"] === "Become a Kalzo artist") return node;
      const child = find(node.c);
      if (child) return child;
    }
    return undefined;
  }
  const section = find(template as Node[]);
  return section ? <div className="ka-original-welcome">{render(section, {}, "artist-welcome")}</div> : null;
}
