"use client";

import Link from "next/link";
import { LuPackage2 } from "react-icons/lu";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { CircleUser, Menu, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/navigation";

function NavBar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  return (
    <div className="flex min-w-screen w-full flex-col  text-slate-200">
      <header className="sticky top-0 flex h-20 items-center gap-4 border-b-2 border-slate-400 bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <LuPackage2 className="h-6 w-6" />
            <span className="sr-only">Bits Bids</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          {/* <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Orders
          </Link> */}
          {/* <Link
            href="/auction"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Auctions
          </Link> */}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden bg-slate-200"
            >
              <Menu className="h-5 w-5 text-slate-950" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-transparent text-slate-200">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <LuPackage2 className="h-6 w-6 " />
                <span className="sr-only">Bits Bids</span>
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
              >
                Orders
              </Link>
              <Link
                href="/auction"
                className="text-muted-foreground hover:text-foreground"
              >
                Auctions
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-slate-200 ml-auto" asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={session?.user?.image} />
                  <AvatarFallback>
                    {session?.user?.name
                      ?.split(" ")
                      .map((el) => el[0].toUpperCase())
                      .reduce((acc, curr) => acc + curr, "")
                      .substring(0, 2) || "NA"}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-slate-200 opacity-90"
              align="end"
            >
              <DropdownMenuLabel>
                <Link href="/profile" className="ml-3">
                  My Account
                </Link>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="mx-4">
                <Button
                  onClick={() => {
                    signOut();
                    router.push("/login");
                  }}
                >
                  Logout
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}

export default NavBar;
