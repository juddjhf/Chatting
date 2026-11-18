import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { FilePlus2, ImagePlus, Paperclip, Send, Smile, Video, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../common/Button";
import { useChat } from "../../context/ChatContext";
import { formatFileSize } from "../../utils/formatFileSize";

const ACCEPTED = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".webm", ".mov"],
  document: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".ppt", ".pptx"],
};
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALL_EXTENSIONS = Object.values(ACCEPTED).flat();
const EmojiPicker = lazy(() => import("emoji-picker-react"));

function classify(file) {
  const extension = `.${file.name.split(".").pop().toLowerCase()}`;
  if (ACCEPTED.image.includes(extension)) return "image";
  if (ACCEPTED.video.includes(extension)) return "video";
  if (ACCEPTED.document.includes(extension)) return "document";
  return null;
}

export default function MessageComposer({ replyTo, onCancelReply, onSent }) {
  const { sendMessage, emitTyping } = useChat();
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl("");
    } else {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [file]);

  useEffect(() => {
    if (!file || !file.type.startsWith("video/")) {
      setVideoPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    emitTyping(false);
  }, [emitTyping]);

  function selectFile(nextFile) {
    if (!nextFile) return;
    const type = classify(nextFile);
    if (!type) {
      toast.error(`Unsupported file. Allowed: ${ALL_EXTENSIONS.join(", ")}`);
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      toast.error("Files must be 25 MB or smaller.");
      return;
    }
    setFile(nextFile);
    setAttachOpen(false);
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    setProgress(0);
    try {
      await sendMessage({ text, file, replyTo, onProgress: setProgress });
      setText("");
      setFile(null);
      onCancelReply?.();
      onSent?.();
      emitTyping(false);
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || error?.message || "Message could not be sent.");
    } finally {
      setSending(false);
      setProgress(0);
    }
  }

  function handleChange(event) {
    setText(event.target.value);
    emitTyping(Boolean(event.target.value.trim()));
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1800);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function triggerFilePicker(accept) {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
    setAttachOpen(false);
  }

  function onEmojiClick(emojiData) {
    const element = inputRef.current;
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emojiData.emoji}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative border-t border-black/[0.06] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
      {replyTo && (
        <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl bg-[#f6f5f3] px-3 py-2">
          <span className="h-8 w-1 rounded-full bg-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">Replying to {replyTo.senderName || "message"}</p>
            <p className="truncate text-xs text-muted">{replyTo.text || replyTo.fileName || "Attachment"}</p>
          </div>
          <button type="button" className="icon-button h-8 w-8" onClick={onCancelReply} aria-label="Cancel reply"><X size={15} /></button>
        </div>
      )}
      {file && (
        <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-xl border border-black/[0.08] bg-[#fbfbfa] p-2.5">
          {previewUrl ? <img src={previewUrl} alt="Selected image preview" className="h-12 w-12 rounded-lg object-cover" /> : file.type.startsWith("video/") ? <video src={videoPreviewUrl} className="h-12 w-16 rounded-lg bg-black object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f0efed]"><FilePlus2 size={18} /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="mt-0.5 text-xs text-muted">{formatFileSize(file.size)} {sending ? `· Uploading ${progress}%` : "· Ready to send"}</p>
            {sending && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress}%` }} /></div>}
          </div>
          {!sending && <button type="button" className="icon-button h-8 w-8" onClick={() => setFile(null)} aria-label="Remove attachment"><X size={16} /></button>}
        </div>
      )}
      <div className="relative mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-black/[0.09] bg-[#fbfbfa] p-2 focus-within:border-black/25 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,0,0,.025)]">
        <input ref={fileRef} type="file" className="hidden" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="relative">
          <button type="button" className="icon-button h-10 w-10" onClick={() => { setAttachOpen(!attachOpen); setEmojiOpen(false); }} aria-label="Attach a file" disabled={sending}><Paperclip size={18} /></button>
          {attachOpen && (
            <div className="absolute bottom-12 left-0 z-30 w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-soft animate-card">
              <button type="button" className="menu-item" onClick={() => triggerFilePicker(ACCEPTED.image.join(","))}><ImagePlus size={16} /> Photo</button>
              <button type="button" className="menu-item" onClick={() => triggerFilePicker(ACCEPTED.video.join(","))}><Video size={16} /> Video</button>
              <button type="button" className="menu-item" onClick={() => triggerFilePicker(ACCEPTED.document.join(","))}><FilePlus2 size={16} /> Document</button>
            </div>
          )}
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          maxLength={5000}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 outline-none placeholder:text-muted/80"
          aria-label="Message"
          disabled={sending}
        />
        <div className="relative">
          <button type="button" className="icon-button h-10 w-10" onClick={() => { setEmojiOpen(!emojiOpen); setAttachOpen(false); }} aria-label="Choose emoji" disabled={sending}><Smile size={18} /></button>
          {emojiOpen && (
            <div className="absolute bottom-12 right-0 z-30">
              <Suspense fallback={<div className="rounded-2xl bg-white p-5 text-sm text-muted shadow-soft">Loading emoji…</div>}>
                <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} searchDisabled={false} />
              </Suspense>
            </div>
          )}
        </div>
        <Button type="submit" className="!min-h-10 !w-10 !rounded-xl !p-0" aria-label="Send message" disabled={(!text.trim() && !file) || sending} loading={sending}>
          {!sending && <Send size={16} />}
        </Button>
      </div>
      <p className="mx-auto mt-2 hidden max-w-3xl text-[10px] text-muted sm:block">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
}
