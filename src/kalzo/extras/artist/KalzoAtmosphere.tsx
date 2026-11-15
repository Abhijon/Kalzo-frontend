export function KalzoAtmosphere() {
  return <div className="ka-lamp-atmosphere" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div className="ka-hanging-lamp" key={i}><svg viewBox="0 0 60 200"><path d="M30 0v85M20 85h20l10 65H10zM15 155h30M23 165h14" /><path className="ka-lamp-flame" d="M30 108c-14 18-11 29 0 34 11-5 14-16 0-34z" /></svg></div>)}</div>;
}