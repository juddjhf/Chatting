import { ArrowUpRight, Plus, UsersRound } from "lucide-react";
import Button from "../common/Button";

export default function HomeActions({ onCreate, onJoin }) {
  return (
    <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
      <Button onClick={onCreate} className="min-w-44">
        <Plus size={17} /> Create Group
      </Button>
      <Button onClick={onJoin} variant="secondary" className="min-w-44">
        <UsersRound size={17} /> Enter Group <ArrowUpRight size={15} className="ml-1 opacity-60" />
      </Button>
    </div>
  );
}
