import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <AuthCheck>
      <div className="flex flex-col min-h-screen text-slate-200 gap-12 items-center">
        <NavBar />
        <div className="text-6xl md:text-8xl text-slate-200 mt-28">Midas</div>
        <Link
          href="/dashboard"
          className="text-xl md:text-2xl border-2 border-slate-300 p-3 flex items-center gap-2 w-44 md:w-48 hover:bg-slate-900 hover:scale-105"
        >
          <p>Get Started</p>
          <ArrowRight />
        </Link>
      </div>
    </AuthCheck>
  );
}
