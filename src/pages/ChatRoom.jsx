import { useState } from "react";
import { useParams } from "react-router-dom";
import { ChatProvider, useChat } from "../context/ChatContext";
import ChatHeader from "../components/chat/ChatHeader";
import MessageComposer from "../components/chat/MessageComposer";
import MessageList from "../components/chat/MessageList";
import ChatSidebar from "../components/layout/ChatSidebar";
import GroupInfoPanel from "../components/layout/GroupInfoPanel";
import Modal from "../components/common/Modal";
import AuthenticatedMedia from "../components/common/AuthenticatedMedia";
import Button from "../components/common/Button";
import toast from "react-hot-toast";

function ChatContent() {
  const { groupCode } = useParams();
  const {
    group, messages, loading, loadingOlder, hasOlder, loadOlder, reload,
    deleteMessage, typingMembers, pageError,
  } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [preview, setPreview] = useState(null);

  async function handleDelete(message) {
    if (!window.confirm("Delete this message for everyone in the group?")) return;
    try {
      await deleteMessage(message._id || message.id);
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error?.userMessage || "Unable to delete the message.");
    }
  }

  if (pageError && !loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
          <h1 className="text-lg font-semibold">Could not open this group</h1>
          <p className="mt-2 text-sm text-muted">{pageError}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => window.location.assign("/")}>Return home</Button>
            <Button onClick={reload}>Try again</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#f8f8f7] p-0 md:p-4 lg:p-5">
      <div className="chat-shell mx-auto grid h-full max-w-[1600px] grid-cols-1 overflow-hidden bg-white md:rounded-2xl md:border md:border-black/[0.06] md:shadow-soft lg:grid-cols-[270px_minmax(0,1fr)_290px]">
        <div className={`fixed inset-0 z-40 lg:static lg:z-auto ${sidebarOpen ? "block" : "hidden lg:block"}`}>
          <button className="absolute inset-0 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close members menu" />
          <div className="relative z-10 h-full w-[min(84vw,310px)] shadow-xl lg:w-full lg:shadow-none">
            <ChatSidebar compact onClose={() => setSidebarOpen(false)} onOpenInfo={() => { setInfoOpen(true); setSidebarOpen(false); }} />
          </div>
        </div>
        <section className="flex min-h-0 min-w-0 flex-col">
          <ChatHeader onOpenSidebar={() => setSidebarOpen(true)} onOpenInfo={() => setInfoOpen(true)} />
          <MessageList
            messages={messages}
            loading={loading}
            loadingOlder={loadingOlder}
            hasOlder={hasOlder}
            onLoadOlder={loadOlder}
            onReply={setReplyTo}
            onDelete={handleDelete}
            onPreview={setPreview}
            typingMembers={typingMembers}
          />
          <MessageComposer replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </section>
        <div className={`fixed inset-0 z-40 lg:static lg:z-auto ${infoOpen ? "block" : "hidden lg:block"}`}>
          <button className="absolute inset-0 bg-black/40 lg:hidden" onClick={() => setInfoOpen(false)} aria-label="Close group information" />
          <div className="absolute right-0 top-0 z-10 h-full w-[min(88vw,340px)] shadow-xl lg:static lg:w-full lg:shadow-none">
            <GroupInfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
          </div>
        </div>
      </div>
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name || "Image preview"} wide>
        {preview?.type === "image" && <AuthenticatedMedia url={preview.url} alt={preview.name} className="mx-auto flex justify-center [&_img]:max-h-[72vh] [&_img]:max-w-full [&_img]:object-contain" />}
      </Modal>
      <span className="sr-only">{group?.name || groupCode}</span>
    </main>
  );
}

export default function ChatRoom() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}
