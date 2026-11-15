import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { accountData, supportHistory } from "@/lib/kalzo.functions";
import { api } from "@/lib/api";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { kalzoHead } from "@/lib/routeHead";
import { MessageSquare, Plus } from "lucide-react";
import "@/kalzo/extras/support/support.css";
export const Route = createFileRoute("/support_/$threadId")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Support conversation", "A private saved Kalzo support issue.", true),
  component: () => (
    <AccountShell title="Kalzo support">
      <Thread />
    </AccountShell>
  ),
});
function Thread() {
  const { threadId } = Route.useParams();
  const read = useServerFn(supportHistory),
    list = useServerFn(accountData);
  const [d, setD] = useState<{ title: string; messages: UIMessage[] } | null>(null),
    [threads, setThreads] = useState<Awaited<ReturnType<typeof accountData>>["threads"]>([]),
    [err, setErr] = useState("");
  useEffect(() => {
    setD(null);
    read({ data: { id: threadId } })
      .then((x) => setD({ title: x.thread.title, messages: x.messages as unknown as UIMessage[] }))
      .catch((e) => setErr(e.message));
    list()
      .then((x) => setThreads(x.threads))
      .catch((e) => setErr(e.message));
  }, [read, list, threadId]);
  return (
    <div className="kl-chat-layout ks ks-thread">
      <aside className="kl-chat-side ks-thread-side">
        <Link to="/support">
          <Plus size={16} /> New issue
        </Link>
        {threads.map((t) => (
          <Link key={t.id} to="/support/$threadId" params={{ threadId: t.id }}>
            {t.title}
          </Link>
        ))}
      </aside>
      <section className="ks-thread-main">
        {err && <p className="kl-error">{err}</p>}
        {d ? (
          <Chat key={threadId} id={threadId} initial={d.messages} title={d.title} />
        ) : (
          <p>Loading conversation…</p>
        )}
      </section>
    </div>
  );
}
function Chat({ id, initial, title }: { id: string; initial: UIMessage[]; title: string }) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, stop, error } = useChat({
    id,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/support-chat",
      body: { threadId: id },
      headers: async () => {
        const { data } = await api.auth.getSession();
        return { Authorization: "Bearer " + (data?.session?.access_token ?? "") };
      },
    }),
  });
  useEffect(() => {
    if (status === "ready") input.current?.focus();
  }, [status]);
  return (
    <>
      <header className="ks-chat-header">
        <div>
          <span className="ks-overline">YOUR KALZO CONVERSATION</span>
          <h2>{title}</h2>
          <p>Tell us what happened. We’re listening.</p>
        </div>
        <div className="ks-seal" aria-label="Kalzo support">
          K
        </div>
      </header>
      <PromptInput
        className="ks-compose"
        onSubmit={() => {
          if (text.trim()) {
            void sendMessage({ text: text.trim() });
            setText("");
          }
        }}
      >
        <PromptInputTextarea
          ref={input}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={`Describe your ${title.toLowerCase()} issue`}
          placeholder={
            title === "Other help"
              ? "Write down your whole issue here…"
              : `Write your ${title.toLowerCase()} details here…`
          }
          maxLength={2000}
        />
        <PromptInputFooter>
          <span>{text.length}/2000</span>
          <PromptInputSubmit
            aria-label="Send message"
            title="Send message"
            status={status}
            onStop={stop}
            disabled={!text.trim() && status === "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
      <Conversation className="ks-transcript">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="ks-start">
              <MessageSquare size={22} />
              <p>Your {title.toLowerCase()} conversation starts here.</p>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "kl-user" : ""}>
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    <MessageResponse key={i}>{p.text}</MessageResponse>
                  ) : p.type === "reasoning" ? (
                    <details key={i}>
                      <summary>Thinking</summary>
                      {p.text}
                    </details>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Kalzo support is thinking…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {error && (
        <p role="alert" className="kl-error">
          {error.message}
        </p>
      )}
      <p className="ks-chat-note">
        AI guidance only. Refunds, identity approval and payouts require confirmed processing; never
        share Aadhaar numbers or secret codes here.
      </p>
    </>
  );
}
