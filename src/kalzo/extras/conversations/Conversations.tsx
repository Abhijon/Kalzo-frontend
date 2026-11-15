import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Video, CalendarIcon, Send, Clock } from "lucide-react";
import "./conversations.css";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  patronData,
  conversationData,
  sendArtistMessage,
  scheduleMeeting,
  decideMeeting,
} from "@/lib/patron.functions";
export function ConversationList() {
  const read = useServerFn(patronData);
  const [d, setD] = useState<Awaited<ReturnType<typeof patronData>> | null>(null),
    [error, setError] = useState("");
  const [view, setView] = useState("chats");
  useEffect(() => {
    read()
      .then(setD)
      .catch((e) => setError(e.message));
  }, [read]);
  return (
    <>
      <div className="ka-section-title">
        <MessageSquare size={30} />
        <h2>Chats & scheduled calls</h2>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="ka-communication-tabs" role="group" aria-label="Conversation views">
        <Button variant="outline" aria-pressed={view === "chats"} onClick={() => setView("chats")}><MessageSquare size={22}/> Chats <b>{d?.conversations.length ?? 0}</b></Button>
        <Button variant="outline" aria-pressed={view === "calls"} onClick={() => setView("calls")}><Video size={22}/> Calls <b>{d?.conversations.filter(c => c.next_meeting).length ?? 0}</b></Button>
      </div>
      {d?.conversations.length ? (
        <>{d.conversations.filter(c => view === "chats" || c.next_meeting).map((c) => (
          <article className="ka-booking kc-correspondence" key={c.id}>
            <MessageSquare size={24} />
            <h2>{c.participant_name || c.artist_name}</h2>
            <p>{c.latest_message || "A private conversation on Kalzo"}</p>
            {c.next_meeting && <p><Clock size={16} /> Call invitation · {new Date(c.next_meeting).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>}
            <Link to="/conversations/$conversationId" params={{ conversationId: c.id }}>
              Open conversation & schedule a call →
            </Link>
          </article>
        ))}{view === "calls" && !d.conversations.some(c => c.next_meeting) && <div className="ka-quiet-state"><Video size={38}/><h3>No scheduled calls yet</h3></div>}</>
      ) : (
        <div className="kc-salon ka-open-salon">
          <svg className="kc-scene" viewBox="0 0 520 220" aria-hidden="true">
            <g className="kc-letter kc-l1"><rect x="40" y="60" width="70" height="46" rx="3" /><path d="M40 60l35 26 35-26" /></g>
            <g className="kc-letter kc-l2"><rect x="410" y="40" width="64" height="42" rx="3" /><path d="M410 40l32 24 32-24" /></g>
            <g className="kc-phone">
              <path className="kc-base" d="M200 190h120l-14-60h-92z" />
              <circle className="kc-dial" cx="260" cy="160" r="20" />
              <circle cx="260" cy="160" r="6" className="kc-hub" />
              <path className="kc-receiver" d="M190 112c0-22 30-30 70-30s70 8 70 30l-16 6c-4-10-24-14-54-14s-50 4-54 14z" />
            </g>
            <g className="kc-rings"><path d="M340 90q14 12 0 26" /><path d="M354 80q24 22 0 46" /><path d="M180 90q-14 12 0 26" /><path d="M166 80q-24 22 0 46" /></g>
            <g className="kc-watch"><circle cx="110" cy="170" r="24" /><line className="kc-hand" x1="110" y1="170" x2="110" y2="152" /><circle cx="110" cy="142" r="4" /></g>
          </svg>
          <h3>{view === "chats" ? "Your next conversation awaits" : "No scheduled calls yet"}</h3>
          <p>{view === "chats" ? "Your client conversations and message histories will appear here." : "Accepted calls and new call invitations will appear here."}</p>
        </div>
      )}
    </>
  );
}
export function ConversationRoom({ id }: { id: string }) {
  const read = useServerFn(conversationData),
    send = useServerFn(sendArtistMessage),
    schedule = useServerFn(scheduleMeeting),
    decide = useServerFn(decideMeeting);
  const [d, setD] = useState<Awaited<ReturnType<typeof conversationData>> | null>(null),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [day, setDay] = useState<Date>(),
    [hour, setHour] = useState("10"),
    [minute, setMinute] = useState("00"),
    [period, setPeriod] = useState("AM"),
    [consent, setConsent] = useState(false);
  const load = useCallback(
    () =>
      read({ data: { id } })
        .then(setD)
        .catch((e) => setError(e.message)),
    [read, id],
  );
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);
  async function act(f: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await f();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    if (!day) return;
    const h = (Number(hour) % 12) + (period === "PM" ? 12 : 0);
    const local = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}T${String(h).padStart(2, "0")}:${minute}:00+05:30`;
    await act(async () => {
      await schedule({
        data: { id, event_at: new Date(local).toISOString(), duration: 30, consent: true },
      });
      setOpen(false);
    });
  }
  return (
    <>
      <div className="ka-section-title">
        <MessageSquare size={30} />
        <div>
          <h2>{d?.conversation?.artist_name || "Your conversation"}</h2>
          <p>Private Kalzo chat</p>
        </div>
        <Button className="ml-auto" onClick={() => setOpen(true)}>
          <Video size={16} />
          Schedule a call
        </Button>
      </div>
      {error && (
        <p role="alert" className="kl-error">
          {error}
        </p>
      )}
      <div className="kl-form">
        <section>
          <h2>Conversation</h2>
          <div className="ka-chat-messages">
            {d?.messages.map((m) => (
              <p key={m.id} className={m.sender_id === d.userId ? "ka-chat-own" : ""}>
                <small>
                  {m.sender_id === d.userId ? "You" : "Participant"} ·{" "}
                  {new Date(m.created_at).toLocaleString("en-IN")}
                </small>
                {m.body}
              </p>
            ))}
            {!d?.messages.length && <p>No messages yet.</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await send({ data: { id, body: text } });
                setText("");
              });
            }}
          >
            <label>
              Your message
              <textarea
                aria-label="Message to participant"
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                rows={4}
              />
            </label>
            <Button disabled={busy || !text.trim()} type="submit">
              <Send size={16} />
              Send message
            </Button>
          </form>
          <p className="kl-note">
            Keep bookings and payments on Kalzo. Contact and off-platform payment details are
            blocked.
          </p>
        </section>
        <section>
          <h2>Scheduled calls & recordings</h2>
          <p>{d?.meetings.filter(m => m.status !== "declined").length ?? 0} call invitations · {d?.meetings.filter(m => !!m.recording_url).length ?? 0} recordings</p>
          {d?.meetings.map((m) => (
            <article className="ka-booking" key={m.id}>
              <Clock size={20} />
              <h3>
                {new Date(m.event_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
              </h3>
              <p>
                {m.duration_minutes} minutes · Zoom · {m.status.replaceAll("_", " ")}
              </p>
              {m.status === "pending" && d.conversation?.artist_owner_id === d.userId && (
                <div className="kl-actions">
                  <Button
                    disabled={busy}
                    onClick={() => void act(() => decide({ data: { id: m.id, accept: true } }))}
                  >
                    Accept invitation
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act(() => decide({ data: { id: m.id, accept: false } }))}
                  >
                    Decline
                  </Button>
                </div>
              )}
              {m.status === "accepted_setup_required" && (
                <p>
                  Accepted. Kalzo’s Zoom connection is still required before a meeting link can be
                  issued.
                </p>
              )}
              {m.join_url && (
                <a href={m.join_url} target="_blank" rel="noreferrer">
                  Join Zoom call
                </a>
              )}
              {m.recording_url && (
                <a href={m.recording_url} target="_blank" rel="noreferrer">
                  View meeting recording
                </a>
              )}
            </article>
          ))}
          {!d?.meetings.length && <p>No scheduled calls.</p>}
        </section>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Schedule a Zoom call</DialogTitle>
          <DialogDescription>
            A 30-minute invitation hosted by Kalzo. Zoom connection is pending; the artist can
            accept the request.
          </DialogDescription>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon size={16} />
                {day ? day.toLocaleDateString("en-IN") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto">
              <Calendar
                mode="single"
                selected={day}
                onSelect={setDay}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
          <div className="kl-actions">
            <label>
              Hour
              <select
                aria-label="Meeting hour"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label>
              Minutes
              <select
                aria-label="Meeting minute"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              >
                {["00", "15", "30", "45"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              AM / PM
              <select
                aria-label="AM or PM"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </label>
          </div>
          <p>All times are India Standard Time (IST).</p>
          <p className="kl-note">This call is going to be recorded. Do not discuss off-platform deals; doing so may lead to suspension of your account.</p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree that this call may be recorded and shared privately with the participants.
          </label>
          <Button disabled={!day || !consent || busy} onClick={() => void book()}>
            Send meeting invitation
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
