import { useState } from "react";
import { Check, CheckCheck, Copy, CornerUpLeft, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../common/Avatar";
import AuthenticatedMedia from "../common/AuthenticatedMedia";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import api from "../../services/api";
import { formatTime } from "../../utils/formatDate";
import { formatFileSize } from "../../utils/formatFileSize";

const idOf = (value) => String(value?._id || value?.id || value?.memberId || value || "");

export default function MessageItem({ message, onReply, onDelete, onPreview }) {
  const { session } = useAuth();
  const { group } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentId = idOf(session?.member);
  const senderId = idOf(message.senderId || message.sender);
  const own = senderId && senderId === currentId;
  const isAdmin = session?.member?.role === "admin" || session?.member?.isAdmin || idOf(group?.creator) === currentId;
  const canDelete = own || isAdmin;
  const senderName = message.senderName || message.sender?.nickname || message.sender?.name || "Guest";
  const timestamp = formatTime(message.createdAt || message.updatedAt);
  const type = message.messageType || "text";
  const fileUrl = message.fileUrl || message.url;
  const fileName = message.fileName || "Shared file";
  const reply = typeof message.replyTo === "object" ? message.replyTo : null;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(message.text || fileUrl || "");
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy message.");
    }
  }

  async function downloadFile() {
    try {
      const { data } = await api.get(fileUrl, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error?.userMessage || "Unable to download this file.");
    }
  }

  return (
    <article className={`group flex gap-3 py-2.5 ${own ? "flex-row-reverse" : ""} animate-message`}>
      {!own && <Avatar name={senderName} size="sm" className="mt-1" />}
      <div className={`min-w-0 max-w-[86%] sm:max-w-[76%] ${own ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`mb-1.5 flex items-center gap-2 px-1 text-xs ${own ? "flex-row-reverse" : ""}`}>
          <span className="font-semibold text-ink">{own ? "You" : senderName}</span>
          {timestamp && <time className="text-muted">{timestamp}</time>}
        </div>
        <div className={`relative rounded-2xl px-4 py-3 ${own ? "rounded-tr-md bg-ink text-white" : "rounded-tl-md bg-white text-ink shadow-[0_3px_14px_rgba(0,0,0,.035)]"}`}>
          {message.isDeleted ? (
            <p className="text-sm italic opacity-60">This message was deleted.</p>
          ) : (
            <>
              {reply && (
                <div className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${own ? "border-white/45 bg-white/10 text-white/75" : "border-black/25 bg-black/[0.035] text-muted"}`}>
                  <span className="font-semibold">{reply.senderName || "Reply"}</span>
                  <p className="mt-0.5 line-clamp-2">{reply.text || reply.fileName || "Attachment"}</p>
                </div>
              )}
              {type === "image" && fileUrl && (
                <button type="button" className="block overflow-hidden rounded-xl" onClick={() => onPreview({ type: "image", url: fileUrl, name: fileName })}>
                  <AuthenticatedMedia url={fileUrl} alt={fileName} />
                </button>
              )}
              {type === "video" && fileUrl && (
                <AuthenticatedMedia url={fileUrl} type="video" alt={fileName} />
              )}
              {type === "document" && fileUrl && (
                <button type="button" onClick={downloadFile} className={`flex min-w-[210px] items-center gap-3 rounded-xl p-3 text-left transition ${own ? "bg-white/10 hover:bg-white/15" : "bg-black/[0.04] hover:bg-black/[0.07]"}`}>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${own ? "bg-white/10" : "bg-white"}`}><FileText size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block max-w-[190px] truncate text-sm font-semibold">{fileName}</span>
                    <span className={`mt-1 block text-xs ${own ? "text-white/60" : "text-muted"}`}>{formatFileSize(message.fileSize)}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg">↓</span>
                </button>
              )}
              {message.text && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>}
            </>
          )}
          {!message.isDeleted && (
            <div className={`absolute top-1/2 z-10 hidden -translate-y-1/2 gap-0.5 rounded-xl border border-black/[0.06] bg-white p-1 shadow-md group-hover:flex ${own ? "-left-20" : "-right-20"}`}>
              <button type="button" className="icon-button h-8 w-8" onClick={() => onReply(message)} aria-label="Reply to message"><CornerUpLeft size={14} /></button>
              <button type="button" className="icon-button h-8 w-8" onClick={copyText} aria-label="Copy message"><Copy size={14} /></button>
              {canDelete && <button type="button" className="icon-button h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => onDelete(message)} aria-label="Delete message"><Trash2 size={14} /></button>}
            </div>
          )}
        </div>
        {own && (
          <span className="mt-1 mr-1 flex items-center gap-1 text-[10px] text-muted" title="Sent">
            {message._id || message.id ? <CheckCheck size={12} /> : <Check size={12} />} Sent
          </span>
        )}
      </div>
      <button type="button" className="mt-4 text-muted md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Message actions"><MoreHorizontal size={17} /></button>
      {menuOpen && (
        <div className="fixed inset-x-4 bottom-24 z-30 flex gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-soft md:hidden">
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm" onClick={() => { onReply(message); setMenuOpen(false); }}><CornerUpLeft size={15} /> Reply</button>
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm" onClick={() => { copyText(); setMenuOpen(false); }}><Copy size={15} /> Copy</button>
          {canDelete && <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm text-red-600" onClick={() => { onDelete(message); setMenuOpen(false); }}><Trash2 size={15} /> Delete</button>}
        </div>
      )}
    </article>
  );
}
