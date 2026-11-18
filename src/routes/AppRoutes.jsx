import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatRoom from "../pages/ChatRoom";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";

function ProtectedChat() {
  const { session } = useAuth();
  return session?.token ? <ChatRoom /> : <Navigate to="/" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat/:groupCode" element={<ProtectedChat />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
