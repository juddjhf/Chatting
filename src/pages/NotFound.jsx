import { Link } from "react-router-dom";
import Button from "../components/common/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-3 text-3xl font-bold">This page isn’t here</h1>
        <p className="mt-2 text-muted">The link may be incorrect or the group may no longer be available.</p>
        <Link to="/"><Button className="mt-6">Back to home</Button></Link>
      </div>
    </main>
  );
}
