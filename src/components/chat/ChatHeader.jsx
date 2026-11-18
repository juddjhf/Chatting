import { Info, Menu, MoreHorizontal, UsersRound, Wifi, WifiOff } from "lucide-react";
import Avatar from "../common/Avatar";
import { useChat } from "../../context/ChatContext";

export default function ChatHeader({ onOpenSidebar, onOpenInfo }) {
  const { group, members, onlineIds, socketConnected } = useChat();
  return (
    <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-button lg:hidden" onClick={onOpenSidebar} aria-label="Open members"><Menu size={19} /></button>
        <Avatar name={group?.name || "Group"} size="sm" className="hidden sm:inline-flex" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold sm:text-base">{group?.name || "Private group"}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <UsersRound size={13} /> {onlineIds.length} online <span className="text-black/20">·</span> {members.length} members
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs sm:inline-flex ${socketConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {socketConnected ? "Live" : "Reconnecting"}
        </span>
        <button className="icon-button lg:hidden" onClick={onOpenInfo} aria-label="Open group information"><Info size={18} /></button>
        <div className="hidden h-8 items-center -space-x-2 md:flex">
          {members.slice(0, 3).map((member, index) => (
            <Avatar key={member._id || member.id || index} size="sm" name={member.nickname || member.name || "Guest"} className="h-8 w-8 border-2 border-white text-[10px]" />
          ))}
          {members.length > 3 && <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#f0efed] text-[10px] font-semibold">+{members.length - 3}</span>}
        </div>
        <button className="icon-button hidden lg:inline-flex" onClick={onOpenInfo} aria-label="Open group information"><MoreHorizontal size={19} /></button>
      </div>
    </header>
  );
}
