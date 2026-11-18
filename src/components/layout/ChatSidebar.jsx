import { useState } from "react";
import { Copy, Hash, Info, LogOut, MessageCircle, MoreHorizontal, Shield, Users } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

const idOf = (value) => String(typeof value === "string" ? value : value?._id || value?.id || value?.memberId || "");

export default function ChatSidebar({ onOpenInfo, onClose, compact = false }) {
  const { session } = useAuth();
  const { group, members, onlineIds, leaveGroup } = useChat();
  const [leaving, setLeaving] = useState(false);
  const name = group?.name || "Private group";
  const code = group?.groupCode || session?.groupCode;
  const currentId = idOf(session?.member);
  const currentName = session?.member?.nickname || session?.member?.name || "Guest";
  const isAdmin = session?.member?.role === "admin" || session?.member?.isAdmin || idOf(group?.creator) === currentId;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code || "");
      toast.success("Group code copied.");
    } catch {
      toast.error("Could not copy group code.");
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveGroup();
      toast.success("You left the group.");
    } catch (error) {
      toast.error(error?.userMessage || "Unable to leave the group.");
      setLeaving(false);
    }
  }

  return (
    <aside className={`flex h-full flex-col bg-white ${compact ? "" : "border-r border-black/[0.06]"}`}>
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-5">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white"><MessageCircle size={16} /></span>
          Group Chat
        </a>
        {compact && <button className="icon-button" onClick={onClose} aria-label="Close members menu"><MoreHorizontal size={19} /></button>}
      </div>
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{name}</h1>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Hash size={12} /> {code}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 px-2 text-xs font-medium transition hover:bg-black/[0.04]" onClick={copyCode}>
            <Copy size={13} /> Copy code
          </button>
          <button type="button" className="icon-button h-9 w-9" onClick={onOpenInfo} aria-label="Group information"><Info size={16} /></button>
        </div>
      </div>
      <div className="mx-5 border-t border-black/[0.06]" />
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Members</h2>
        <span className="rounded-full bg-[#f3f2f0] px-2 py-0.5 text-xs font-semibold text-ink">{members.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {members.map((member) => {
          const memberId = idOf(member);
          const online = onlineIds.map(String).includes(memberId);
          const memberName = member.nickname || member.name || "Guest";
          const admin = member.role === "admin" || member.isAdmin;
          return (
            <div key={memberId || memberName} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
              <Avatar name={memberName} size="sm" online={online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{memberId === currentId ? `${memberName} (you)` : memberName}</p>
                  {admin && <Shield size={12} className="shrink-0 text-muted" aria-label="Admin" />}
                </div>
                <p className="mt-0.5 text-xs text-muted">{online ? "Online" : "Offline"}</p>
              </div>
            </div>
          );
        })}
        {!members.length && <div className="px-3 py-8 text-center text-xs text-muted">Member list is unavailable.</div>}
      </div>
      <div className="border-t border-black/[0.06] p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <Avatar name={currentName} size="sm" online={true} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentName}</p>
            <p className="mt-0.5 text-xs text-muted">{isAdmin ? "Group admin" : "Group member"}</p>
          </div>
          {isAdmin && <span className="rounded-full bg-[#f2f1ef] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Admin</span>}
        </div>
        <Button variant="secondary" className="w-full !min-h-10" loading={leaving} onClick={handleLeave}>
          <LogOut size={15} /> Leave group
        </Button>
      </div>
    </aside>
  );
}
