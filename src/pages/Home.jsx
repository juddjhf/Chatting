import { useState } from "react";
import CreateGroupForm from "../components/home/CreateGroupForm";
import EnterGroupForm from "../components/home/EnterGroupForm";
import HomeActions from "../components/home/HomeActions";

export default function Home() {
  const [mode, setMode] = useState("home");
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      {mode === "home" ? (
        <section className="animate-card max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-[-0.055em] text-ink sm:text-7xl">Group Chat</h1>
          <p className="mt-4 text-base text-muted sm:text-lg">Private real-time group chat</p>
          <HomeActions onCreate={() => setMode("create")} onJoin={() => setMode("join")} />
        </section>
      ) : mode === "create" ? (
        <CreateGroupForm onBack={() => setMode("home")} />
      ) : (
        <EnterGroupForm onBack={() => setMode("home")} />
      )}
    </main>
  );
}
