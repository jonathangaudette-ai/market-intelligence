import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Redirect to first company or setup page
  redirect("/dashboard");
}
