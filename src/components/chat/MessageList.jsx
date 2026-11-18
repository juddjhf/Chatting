import { useEffect, useMemo, useRef } from "react";
import { ArrowDown, MessageCircle, RefreshCw } from "lucide-react";
import Button from "../common/Button";
import MessageItem from "./MessageItem";
import { formatDay } from "../../utils/formatDate";

export default function MessageList({ messages, loading, loadingOlder, hasOlder, onLoadOlder, onReply, onDelete, onPreview, typingMembers }) {
  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const shouldStick = useRef(true);
  const grouped = useMemo(() => {
    const items = [];
    let previousDay = "";
    for (const message of messages) {
      const date = formatDay(message.createdAt || message.updatedAt);
      if (date !== previousDay) {
        items.push({ kind: "date", id: `date-${date}-${items.length}`, label: date });
        previousDay = date;
      }
      items.push({ kind: "message", id: message._id || message.id || `message-${items.length}`, message });
    }
    return items;
  }, [messages]);

  useEffect(() => {
    if (shouldStick.current) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingMembers.length]);

  function onScroll() {
    const element = scrollRef.current;
    if (!element) return;
    shouldStick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
      {hasOlder && (
        <div className="mb-5 flex justify-center">
          <Button variant="secondary" className="!min-h-9 !px-3 !text-xs" loading={loadingOlder} onClick={onLoadOlder}>
            <RefreshCw size={13} /> Load earlier messages
          </Button>
        </div>
      )}
      {loading ? (
        <div className="space-y-5 py-5" aria-label="Loading conversation">
          {[0, 1, 2, 3].map((item) => <div key={item} className={`flex gap-3 ${item % 2 ? "flex-row-reverse" : ""}`}><div className="skeleton h-9 w-9 rounded-full" /><div className={`skeleton h-16 w-52 rounded-2xl ${item % 2 ? "mr-3" : ""}`} /></div>)}
        </div>
      ) : messages.length ? (
        <div className="mx-auto max-w-3xl">
          {grouped.map((item) => item.kind === "date" ? (
            <div key={item.id} className="my-5 flex items-center gap-3 text-[11px] font-medium text-muted">
              <span className="h-px flex-1 bg-black/[0.07]" /><span>{item.label}</span><span className="h-px flex-1 bg-black/[0.07]" />
            </div>
          ) : (
            <MessageItem key={item.id} message={item.message} onReply={onReply} onDelete={onDelete} onPreview={onPreview} />
          ))}
        </div>
      ) : (
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-muted shadow-sm"><MessageCircle size={23} /></div>
          <h2 className="mt-4 text-base font-semibold">A fresh start</h2>
          <p className="mt-1 max-w-xs text-sm leading-6 text-muted">No messages here yet. Send the first note to the group.</p>
        </div>
      )}
      {!!typingMembers.length && (
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-1 pt-2 text-xs text-muted">
          <span className="typing-dots"><i /><i /><i /></span>
          <span>{typingMembers.map((member) => member.nickname || member.name || "Someone").join(", ")} {typingMembers.length === 1 ? "is" : "are"} typing</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
