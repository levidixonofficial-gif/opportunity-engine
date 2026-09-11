import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { devSignIn } from "@/lib/auth/actions";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/misc";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getAuthUser();
  if (user) redirect("/dashboard");

  const clerkMode = env.AUTH_MODE === "clerk";
  const ClerkSignIn =
    clerkMode && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      ? (await import("@clerk/nextjs")).SignIn
      : null;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-fg text-sm">OE</span>
        Opportunity Engine
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{clerkMode ? "Sign in" : "Sign in (development)"}</CardTitle>
          <p className="text-sm text-muted">
            {clerkMode
              ? "Continue with email or Google."
              : "Local dev mode. Enter any email to create or resume a test account. Swap in Clerk by setting AUTH_MODE=clerk."}
          </p>
        </CardHeader>
        <CardContent>
          {clerkMode ? (
            ClerkSignIn ? (
              <ClerkSignIn routing="hash" fallbackRedirectUrl="/dashboard" />
            ) : (
              <p className="text-sm text-muted">
                Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to load the Clerk sign-in form.
              </p>
            )
          ) : (
            <form action={devSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name (optional)</Label>
                <Input id="name" name="name" type="text" placeholder="Levi" />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="asAdmin" className="size-4 rounded border" />
                Grant admin role (dev only)
              </label>
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted">
        By continuing you agree to the <Link href="/terms" className="underline">Terms</Link>. No income is guaranteed.
      </p>
    </div>
  );
}
