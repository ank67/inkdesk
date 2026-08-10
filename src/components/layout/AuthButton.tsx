import { useEffect, useState } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const read = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      setEmail(user?.email ?? null);
      const pic = user?.user_metadata?.["avatar_url"];
      setAvatar(typeof pic === "string" ? pic : null);
    };
    void supabase.auth.getSession().then(({ data }) => read(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => read(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={email ? `Account: ${email}` : "Sign in"}
        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {avatar ? (
          <img src={avatar} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-secondary">
            <User className="size-4" aria-hidden="true" />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{email ?? "Not signed in"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {email ? (
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={busy} onClick={() => void signIn()}>
            <LogIn className="size-4" aria-hidden="true" /> Continue with Google
          </DropdownMenuItem>
        )}
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Your documents always stay on this device. Signing in only syncs library metadata.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
