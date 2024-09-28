import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";
import Link from "next/link";

export default function Dashboard() {
  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <Link
          href="/transaction"
          className="text-xl md:text-2xl border-2 border-slate-300 p-3 flex items-center gap-2 w-44 md:w-48 hover:bg-slate-900 hover:scale-105"
        >
          <p className="mx-auto">Send Money</p>
        </Link>
        {/* <Card></Card> */}
      </div>
    </AuthCheck>
  );
}
