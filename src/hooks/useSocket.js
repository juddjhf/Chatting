import { useChat } from "../context/ChatContext";

export function useSocket() {
  const { socketConnected, onlineIds, typingMembers, emitTyping } = useChat();
  return { connected: socketConnected, onlineIds, typingMembers, emitTyping };
}
