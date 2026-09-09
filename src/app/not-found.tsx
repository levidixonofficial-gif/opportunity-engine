import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-3xl font-semibold">404</p>
      <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className={buttonVariants() + " mt-4"}>
        Back to dashboard
      </Link>
    </div>
  );
}
