import { useState } from "react";
import { ArrowBigUp, BadgeCheck, Eye, EyeOff, KeyRound, PenLine } from "lucide-react";
import { toast } from "sonner";

import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GENRES } from "@/lib/bestreads/data";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

function Carousel({ dimmed }: { dimmed: boolean }) {
  const row = [...GENRES, ...GENRES];
  return (
    <div
      className={cn(
        "group/marquee relative flex w-full items-end overflow-hidden py-6 transition-all duration-500",
        dimmed && "scale-[1.03] blur-[2px]",
      )}
      aria-hidden
    >
      <div
        className="animate-marquee flex w-max gap-6 px-6 group-hover/marquee:[animation-play-state:paused]"
        style={{ ["--marquee-duration" as string]: "90s" }}
      >
        {row.map((g, i) => (
          <div key={`${g}-${i}`} className="group/cover relative w-36 shrink-0 md:w-44">
            <BookCover
              title={g.replace("#", "")}
              author="Awaiting its first human author"
              cover={i % 10}
              className="transition-transform duration-500 group-hover/cover:-translate-y-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  const { signIn, signUp } = useBestreads();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [code, setCode] = useState("");

  const doSignIn = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) toast.error(res.error ?? "Could not sign in");
    } catch {
      toast.error("We could not reach Bestreads. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doSignUp = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await signUp({ email, password, name, username: newHandle, accessCode: code });
      if (!res.ok) {
        toast.error(res.error ?? "Could not sign up");
      } else if (code.trim().length > 0) {
        toast.success("Hall of Fame editor privileges unlocked", {
          description: "You can now edit the magazine.",
        });
      } else {
        toast.success("Your account is ready. Welcome to Bestreads.");
      }
    } catch {
      toast.error("We could not reach Bestreads. Please try again.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 bg-background/70 backdrop-blur-md transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="relative z-20 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 md:px-12">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">Bestreads</p>
            <p className="text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">
              100% human written
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setMode("signin");
                setOpen(true);
              }}
            >
              Sign in
            </Button>
            <Button
              onClick={() => {
                setMode("signup");
                setOpen(true);
              }}
            >
              Join Bestreads
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-10">
          {!open ? (
            <div className="max-w-2xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <BadgeCheck className="size-3.5 text-verified" />
                Strictly no AI. Every word written by a person.
              </p>
              <h1 className="font-display text-5xl leading-[1.05] font-semibold text-balance md:text-7xl">
                The front page of human writing.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
                Books, poetry and texts, ranked by readers who actually read them. No comments, no
                likes, no dislikes — just upvotes and quiet attention.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => {
                    setMode("signup");
                    setOpen(true);
                  }}
                >
                  <PenLine className="size-4" /> Write something human
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setMode("signin");
                    setOpen(true);
                  }}
                >
                  Sign in
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-5">
                  <form className="flex flex-col gap-4" onSubmit={doSignIn}>
                  <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw">Password</Label>
                    <div className="relative">
                      <Input
                        id="pw"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Opening…" : "Enter the library"}
                  </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form className="flex flex-col gap-4" onSubmit={doSignUp}>
                  <h2 className="font-display text-2xl font-semibold">Create your handle</h2>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <div className="relative">
                      <Input
                        id="su-pw"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">

                    <Label htmlFor="name">Display name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Elena Vasquez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uh">Unique @username</Label>
                    <Input
                      id="uh"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      placeholder="@elena.inkwell"
                    />
                    <p className="text-xs text-muted-foreground">
                      Two Elenas can share a name, never a handle.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code" className="flex items-center gap-1.5">
                      <KeyRound className="size-3.5" /> Secret Access Code
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Magazine passkey"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating…" : "Join Bestreads"}
                  </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <button
                type="button"
                className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Back to the shelf
              </button>
            </div>
          )}
        </div>
        <Carousel dimmed={open} />
      </div>
    </main>
  );
}
