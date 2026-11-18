import { useState } from "react";
import { ArrowLeft, KeyRound, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import FormField from "../common/FormField";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";

export default function EnterGroupForm({ onBack }) {
  const [nickname, setNickname] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { joinGroup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await joinGroup({ nickname, groupCode, password });
      toast.success(`Welcome to ${session.group?.name || "the group"}.`);
      navigate(`/chat/${encodeURIComponent(session.groupCode)}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-card rounded-3xl border border-black/[0.04] bg-white p-7 shadow-soft sm:p-9">
      <button type="button" className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f1ef] text-ink">
        <KeyRound size={21} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Enter a group</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Use the invite code and password shared with you.</p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <FormField id="nickname" label="Nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Leave blank for a guest name" maxLength={32} autoComplete="nickname" />
        <FormField id="groupCode" label="Group code" value={groupCode} onChange={(event) => setGroupCode(event.target.value)} placeholder="Enter your group code" autoComplete="off" required />
        <FormField id="joinPassword" label="Group password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter the group password" autoComplete="current-password" required />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          <LogIn size={16} /> Enter group
        </Button>
      </form>
    </div>
  );
}
