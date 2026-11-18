import { useState } from "react";
import { CalendarDays, Copy, Hash, Shield, Trash2, UsersRound, X } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

const idOf = (value) => String(value?._id || value?.id || value?.memberId || value || "");

export default function GroupInfoPanel({ open, onClose, onRemoveMember }) {
  const { session } = useAuth();
  const { group, members, onlineIds, deleteGroup, removeMember } = useChat();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState("");
  const currentId = idOf(session?.member);
  const creatorId = idOf(group?.creator);
  const creator = members.find((member) => idOf(member) === creatorId);
  const isAdmin = session?.member?.role === "admin" || session?.member?.isAdmin || idOf(group?.creator) === currentId;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group?.groupCode || session?.groupCode || "");
      toast.success("Group code copied.");
    } catch {
      toast.error("Could not copy group code.");
    }
  }

  async function remove(member) {
    const memberId = idOf(member);
    setBusy(memberId);
    try {
      await removeMember(memberId);
      toast.success(`${member.nickname || member.name || "Member"} removed.`);
      onRemoveMember?.(memberId);
    } catch (error) {
      toast.error(error?.userMessage || "Unable to remove member.");
    } finally {
      setBusy("");
    }
  }

  async function closeGroup() {
    setBusy("delete");
    try {
      await deleteGroup();
      toast.success("Group deleted.");
    } catch (error) {
      toast.error(error?.userMessage || "Unable to delete group.");
      setBusy("");
    }
  }

  return (
    <>
      <aside className={`flex h-full flex-col border-l border-black/[0.06] bg-white transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}>
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Details</p>
            <h2 className="mt-1 text-base font-semibold">Group information</h2>
          </div>
          <button className="icon-button lg:hidden" onClick={onClose} aria-label="Close group information"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl bg-[#f7f6f4] p-4">
            <Avatar name={group?.name || "Group"} size="lg" />
            <h3 className="mt-3 text-lg font-semibold">{group?.name || "Private group"}</h3>
            {group?.description && <p className="mt-1 text-sm leading-5 text-muted">{group.description}</p>}
            <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-sm transition hover:bg-[#fdfdfd]" onClick={copyCode}>
              <span className="flex items-center gap-2 text-muted"><Hash size={14} /> Group code</span>
              <span className="flex items-center gap-2 font-semibold text-ink">{group?.groupCode || session?.groupCode} <Copy size={13} /></span>
            </button>
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
              <span className="flex items-center gap-2 text-sm text-muted"><UsersRound size={15} /> Members</span>
              <span className="text-sm font-semibold">{members.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
              <span className="flex items-center gap-2 text-sm text-muted"><CalendarDays size={15} /> Created</span>
              <span className="text-sm font-semibold">
                {group?.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(group.createdAt)) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
              <span className="flex items-center gap-2 text-sm text-muted"><Shield size={15} /> Your role</span>
              <span className="text-sm font-semibold">{isAdmin ? "Admin" : "Member"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
              <span className="flex items-center gap-2 text-sm text-muted"><Shield size={15} /> Group admin</span>
              <span className="max-w-[150px] truncate text-sm font-semibold">{creator?.nickname || creator?.name || (creatorId ? "Group admin" : "Not available")}</span>
            </div>
          </div>
          {isAdmin && (
            <section className="mt-7">
              <h3 className="text-sm font-semibold">Manage members</h3>
              <div className="mt-3 space-y-2">
                {members.filter((member) => idOf(member) !== currentId).map((member) => {
                  const memberId = idOf(member);
                  return (
                    <div key={memberId} className="flex items-center gap-2 rounded-xl border border-black/[0.06] p-2.5">
                      <Avatar name={member.nickname || member.name || "Guest"} size="sm" online={onlineIds.map(String).includes(memberId)} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{member.nickname || member.name || "Guest"}</span>
                      <button type="button" className="icon-button h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => remove(member)} disabled={busy === memberId} aria-label={`Remove ${member.nickname || member.name || "member"}`}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {members.length <= 1 && <p className="text-xs text-muted">You are the only member.</p>}
              </div>
            </section>
          )}
        </div>
        {isAdmin && (
          <div className="border-t border-black/[0.06] p-4">
            <Button variant="danger" className="w-full !min-h-10" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} /> Delete group
            </Button>
          </div>
        )}
      </aside>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this group?">
        <p className="text-sm leading-6 text-muted">This will permanently close the group and remove access for every member. This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" loading={busy === "delete"} onClick={closeGroup}>Delete group</Button>
        </div>
      </Modal>
    </>
  );
}
