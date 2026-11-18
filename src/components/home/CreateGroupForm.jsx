import { useState } from "react";
import { ArrowLeft, Check, Copy, DoorOpen, LockKeyhole, UsersRound } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import FormField from "../common/FormField";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";

export default function CreateGroupForm({ onBack }) {
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { createGroup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const session = await createGroup({ groupName: groupName.trim(), password });
      setCreated(session);
      toast.success("Your private group is ready.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(created.groupCode);
      toast.success("Group code copied.");
    } catch {
      toast.error("Could not copy the code. Please select and copy it.");
    }
  }

  if (created) {
    return (
      <div className="w-full max-w-md animate-card rounded-3xl border border-black/[0.04] bg-white p-7 shadow-soft sm:p-9">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Check size={23} />
        </div>
        <p className="text-sm font-medium text-emerald-700">Group created successfully</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">{created.group?.name || groupName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Share this code and your password with the people you want to invite.</p>
        <div className="mt-6 rounded-2xl border border-black/10 bg-[#fafafa] p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Your group code</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="break-all text-xl font-bold tracking-[0.12em] text-ink">{created.groupCode}</code>
            <Button variant="secondary" className="!min-h-10 !px-3" onClick={copyCode}>
              <Copy size={15} /> <span className="hidden sm:inline">Copy code</span>
            </Button>
          </div>
        </div>
        <Button className="mt-6 w-full" onClick={() => navigate(`/chat/${encodeURIComponent(created.groupCode)}`)}>
          <DoorOpen size={17} /> Enter your group
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-card rounded-3xl border border-black/[0.04] bg-white p-7 shadow-soft sm:p-9">
      <button type="button" className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f1ef] text-ink">
        <UsersRound size={21} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Create a group</h2>
      <p className="mt-2 text-sm leading-6 text-muted">A private space for the people you choose.</p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <FormField id="groupName" label="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Weekend plans" autoComplete="off" maxLength={60} required />
        <FormField id="groupPassword" label="Group password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
        <FormField id="confirmPassword" label="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" autoComplete="new-password" required />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          <LockKeyhole size={16} /> Create group
        </Button>
      </form>
    </div>
  );
}
