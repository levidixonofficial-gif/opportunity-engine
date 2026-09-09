import Link from "next/link";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";

const LOOP = ["Discover", "Evaluate", "Choose", "Plan", "Execute", "Track", "Improve", "Scale"];

export default async function LandingPage() {
  const featured = await db.opportunity.findMany({
    where: { status: "published", featured: true },
    include: { category: true },
    take: 3,
  });

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-20">
        <Badge tone="accent">Legitimate opportunities · No income guarantees</Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn “I want to make money online” into a plan you can actually work.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Opportunity Engine helps you find a realistic way to earn based on your skills, time, and
          budget — then breaks it into next actions and tracks whether it is working.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>Find your opportunity</Link>
          <Link href="/how-it-works" className={buttonVariants({ variant: "outline", size: "lg" })}>
            How it works
          </Link>
        </div>
      </section>

      <section className="border-y bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-sm font-medium text-muted">The loop the whole product is built around</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LOOP.map((step) => (
              <span key={step} className="rounded-md border bg-background px-3 py-1.5 text-sm">
                {step}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">A few opportunities in the library</h2>
        <p className="mt-1 text-muted">
          Every opportunity is described with typical business models and risk factors — never a promised payout.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-5">
                <Badge>{o.category.label}</Badge>
                <h3 className="mt-3 font-semibold">{o.name}</h3>
                <p className="mt-1 text-sm text-muted">{o.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Link href="/opportunities" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Browse all opportunities →
        </Link>
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Start with a short set of questions</h2>
          <p className="mt-2 text-muted">
            Tell us your goal, budget, time, and skills. We score every opportunity for fit and show you why.
          </p>
          <Link href="/sign-in" className={buttonVariants({ size: "lg" }) + " mt-6"}>
            Start exploring
          </Link>
        </div>
      </section>
    </>
  );
}
