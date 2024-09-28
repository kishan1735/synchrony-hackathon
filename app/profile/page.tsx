"use client";

import AuthCheck from "@/components/AuthCheck";
import NavBar from "@/components/NavBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/server/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useCallback, useRef, useState } from "react";

function Page() {
  // const { toast } = useToast();
  // const [open, setOpen] = useState(false);
  // const queryClient = useQueryClient();
  // const { data: session, status } = trpc.user.getUser.useQuery();
  // const userQueryKey = getQueryKey(trpc.user.getUser);
  // const { mutate } = trpc.user.updateUser.useMutation({
  //   onSuccess: () => {
  //     toast({ title: "Success", description: "User updated successfully" });
  //     queryClient.invalidateQueries({ queryKey: userQueryKey });
  //     setTimeout(() => setOpen(false), 1000);
  //   },
  //   onError: (err) => {
  //     toast({
  //       title: "Error",
  //       variant: "destructive",
  //       description: err.message,
  //     });
  //   },
  // });
  const nameRef = useRef<HTMLInputElement>(null);
  // const handleClick = useCallback(() => {
  //   mutate({ name: nameRef.current?.value! });
  // }, [mutate]);
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col items-center">
        <NavBar />
        {/* <Card className="max-w-sm md:max-w-lg px-2 mx-8 md:mx-2 my-auto">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl mx-auto">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4"> */}
        {/* {status === "success" ? (
                <>
                  <div className="flex items-center justify-center">
                    <Avatar className="h-12 w-12 md:h-16 md:w-16">
                      <AvatarImage src={session?.image || ""} />
                      <AvatarFallback>
                        {session?.name
                          ?.split(" ")
                          .map((el) => el[0].toUpperCase())
                          .reduce((acc, curr) => acc + curr, "")
                          .substring(0, 2) || "NA"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Label
                      htmlFor="name"
                      className="font-medium text-md md:text-xl"
                    >
                      Name
                    </Label>
                    <div id="name" className="text-md md:text-lg">
                      {session?.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <Label
                      htmlFor="email"
                      className="font-medium text-md md:text-xl"
                    >
                      Email
                    </Label>
                    <div id="email" className="text-md md:text-lg">
                      {session?.email}
                    </div>
                  </div>
                </>
              ) : (
                <LoadingSpinner className="mx-auto" />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="text-md py-1 mx-auto">Edit Profile</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] opacity-90">
                <DialogHeader>
                  <DialogTitle className="py-2">Edit profile</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when
                    you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Name..."
                      defaultValue={session?.name || ""}
                      className="col-span-3"
                      ref={nameRef}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleClick}>
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card> */}
      </div>
    </AuthCheck>
  );
}

export default Page;
