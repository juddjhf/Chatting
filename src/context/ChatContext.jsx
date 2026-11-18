import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import api, { getErrorMessage } from "../services/api";
import { createChatSocket } from "../services/socket";

const ChatContext = createContext(null);
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const asArray = (value) => (Array.isArray(value) ? value : value?.messages || value?.members || []);
const idOf = (value) => String(typeof value === "string" ? value : value?._id || value?.id || value?.memberId || "");
const normalizeSocketMember = (payload) => payload?.member || {
  id: typeof payload === "string" ? payload : payload?.memberId || payload?.userId || payload?._id || payload?.id,
  nickname: payload?.nickname || payload?.userName || payload?.senderName || "Guest",
};

export function ChatProvider({ children }) {
  const { groupCode = "" } = useParams();
  const { session, clearSession } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const pageRef = useRef(1);
  const [group, setGroup] = useState(session?.group || null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [typingMembers, setTypingMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadData = useCallback(async () => {
    if (!session?.token || !groupCode) return;
    setLoading(true);
    setPageError("");
    try {
      const encodedCode = encodeURIComponent(groupCode);
      const [groupResponse, membersResponse, messagesResponse] = await Promise.all([
        api.get(`/api/groups/${encodedCode}`),
        api.get(`/api/groups/${encodedCode}/members`),
        api.get(`/api/messages/${encodedCode}`, { params: { page: 1, limit: 30 } }),
      ]);
      const nextGroup = unwrap(groupResponse);
      const nextMembers = asArray(unwrap(membersResponse));
      const messageData = unwrap(messagesResponse);
      const nextMessages = asArray(messageData);
      pageRef.current = 1;
      setGroup(nextGroup?.group || nextGroup);
      setMembers(nextMembers);
      setMessages(nextMessages);
      setHasOlder(messageData?.hasMore ?? nextMessages.length >= 30);
    } catch (error) {
      const message = getErrorMessage(error);
      setPageError(message);
      toast.error(message);
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
        clearSession();
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [session?.token, groupCode, clearSession, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!session?.token || !groupCode) return undefined;
    const socket = createChatSocket(session.token);
    socketRef.current = socket;

    const onConnect = () => {
      setSocketConnected(true);
      socket.emit("join_group", { groupCode });
    };
    const onDisconnect = () => {
      setSocketConnected(false);
      setOnlineIds([]);
    };
    const onConnectError = (error) => {
      setSocketConnected(false);
      toast.error(error?.message || "Could not connect to live chat.");
    };
    const onNewMessage = (payload) => {
      const message = payload?.message || payload;
      const eventGroupCode = message?.groupCode || payload?.groupCode;
      if (eventGroupCode && String(eventGroupCode) !== String(groupCode)) return;
      if (!message?._id && !message?.id) return;
      setMessages((current) =>
        current.some((item) => idOf(item) === idOf(message)) ? current : [...current, message],
      );
    };
    const onMemberJoined = (payload) => {
      const member = normalizeSocketMember(payload);
      if (!member || !idOf(member)) return;
      setMembers((current) => (current.some((item) => idOf(item) === idOf(member)) ? current : [...current, member]));
      if (idOf(member) !== idOf(session.member)) toast(`${member.nickname || member.name || "Someone"} joined the group.`);
    };
    const onMemberLeft = (payload) => {
      const member = normalizeSocketMember(payload);
      const memberId = idOf(member);
      if (memberId) setMembers((current) => current.filter((item) => idOf(item) !== memberId));
      if (memberId) setOnlineIds((current) => current.filter((id) => String(id) !== memberId));
      if (memberId && memberId !== idOf(session.member)) toast(`${member.nickname || "A member"} left the group.`);
    };
    const onOnlineMembers = (payload) => {
      const online = Array.isArray(payload) ? payload : payload?.members || payload?.onlineMembers || [];
      setOnlineIds(online.map((member) => (typeof member === "string" ? member : idOf(normalizeSocketMember(member)))).filter(Boolean));
    };
    const onTyping = (payload) => {
      const member = normalizeSocketMember(payload);
      const memberId = idOf(member);
      if (!memberId || memberId === idOf(session.member)) return;
      setTypingMembers((current) => (current.some((item) => idOf(item) === memberId) ? current : [...current, member]));
    };
    const onStoppedTyping = (payload) => {
      const memberId = idOf(normalizeSocketMember(payload));
      setTypingMembers((current) => current.filter((member) => idOf(member) !== memberId));
    };
    const onMessageDeleted = (payload) => {
      const deletedId = String(payload?.messageId || payload?._id || payload?.id || "");
      if (deletedId) setMessages((current) => current.map((item) => idOf(item) === deletedId ? { ...item, isDeleted: true, text: "" } : item));
    };
    const onMemberRemoved = (payload) => {
      const memberId = String(payload?.memberId || payload?._id || "");
      if (!memberId) return;
      if (memberId === idOf(session.member)) {
        toast.error("Your access to this group was removed.");
        clearSession();
        navigate("/", { replace: true });
        return;
      }
      setMembers((current) => current.filter((member) => idOf(member) !== memberId));
    };
    const onGroupDeleted = (payload) => {
      if (payload?.groupCode && payload.groupCode !== groupCode) return;
      toast.error("This group has been deleted.");
      clearSession();
      navigate("/", { replace: true });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("new_message", onNewMessage);
    socket.on("member_joined", onMemberJoined);
    socket.on("member_left", onMemberLeft);
    socket.on("online_members", onOnlineMembers);
    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStoppedTyping);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("member_removed", onMemberRemoved);
    socket.on("group_deleted", onGroupDeleted);
    socket.connect();

    return () => {
      socket.emit("leave_group", { groupCode });
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setSocketConnected(false);
    };
  }, [session?.token, session?.member, groupCode, clearSession, navigate]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const { data } = await api.get(`/api/messages/${encodeURIComponent(groupCode)}`, {
        params: { page: pageRef.current + 1, limit: 30 },
      });
      const result = unwrap({ data });
      const older = asArray(result);
      pageRef.current += 1;
      setMessages((current) => {
        const knownIds = new Set(current.map(idOf));
        return [...older.filter((message) => !knownIds.has(idOf(message))), ...current];
      });
      setHasOlder(result?.hasMore ?? older.length >= 30);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  }, [groupCode, hasOlder, loadingOlder]);

  const sendMessage = useCallback(async ({ text = "", replyTo = null, file = null, onProgress }) => {
    let attachment = {};
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupCode", groupCode);
      const { data: uploadResponse } = await api.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
        },
      });
      const uploaded = unwrap({ data: uploadResponse });
      attachment = {
        uploadId: uploaded.uploadId || uploaded._id || uploaded.id,
        fileUrl: uploaded.fileUrl || uploaded.secure_url || uploaded.url,
        fileName: uploaded.fileName || uploaded.originalName || file.name,
        fileSize: uploaded.fileSize || uploaded.size || file.size,
        mimeType: uploaded.mimeType || uploaded.mimetype || file.type,
        messageType: uploaded.messageType || (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document"),
      };
      if (!attachment.fileUrl) throw new Error("The upload service did not return a file URL.");
      if (!attachment.uploadId) throw new Error("The upload service did not return an upload ID.");
    }
    const payload = {
      groupCode,
      messageType: attachment.messageType || "text",
      clientMessageId: crypto.randomUUID(),
      ...(text.trim() ? { text: text.trim() } : {}),
      ...(replyTo ? { replyTo: idOf(replyTo) || replyTo } : {}),
      ...attachment,
    };
    const { data } = await api.post("/api/messages", payload);
    const message = unwrap({ data })?.message || unwrap({ data });
    if (message?._id || message?.id) {
      setMessages((current) => current.some((item) => idOf(item) === idOf(message)) ? current : [...current, message]);
    }
    return message;
  }, [groupCode]);

  const deleteMessage = useCallback(async (messageId) => {
    await api.delete(`/api/messages/${encodeURIComponent(messageId)}`);
    setMessages((current) => current.map((message) => idOf(message) === String(messageId) ? { ...message, isDeleted: true, text: "" } : message));
  }, []);

  const leaveGroup = useCallback(async () => {
    await api.post(`/api/groups/${encodeURIComponent(groupCode)}/leave`);
    socketRef.current?.emit("leave_group", { groupCode });
    clearSession();
    navigate("/", { replace: true });
  }, [groupCode, clearSession, navigate]);

  const removeMember = useCallback(async (memberId) => {
    await api.delete(`/api/groups/${encodeURIComponent(groupCode)}/members/${encodeURIComponent(memberId)}`);
    setMembers((current) => current.filter((member) => idOf(member) !== String(memberId)));
  }, [groupCode]);

  const deleteGroup = useCallback(async () => {
    await api.delete(`/api/groups/${encodeURIComponent(groupCode)}`);
    socketRef.current?.emit("leave_group", { groupCode });
    clearSession();
    navigate("/", { replace: true });
  }, [groupCode, clearSession, navigate]);

  const emitTyping = useCallback((typing) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(typing ? "typing_start" : "typing_stop", { groupCode });
  }, [groupCode]);

  const value = useMemo(() => ({
    group, members, messages, onlineIds, typingMembers, loading, loadingOlder, hasOlder,
    socketConnected, pageError, loadOlder, sendMessage, deleteMessage, leaveGroup,
    removeMember, deleteGroup, emitTyping, reload: loadData,
  }), [
    group, members, messages, onlineIds, typingMembers, loading, loadingOlder, hasOlder,
    socketConnected, pageError, loadOlder, sendMessage, deleteMessage, leaveGroup,
    removeMember, deleteGroup, emitTyping, loadData,
  ]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used inside ChatProvider.");
  return context;
}
