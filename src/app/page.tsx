import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { companyMembers, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Try to get active company from cookie
  let currentCompany = await getCurrentCompany();

  // If no active company, get user's first company
  if (!currentCompany) {
    const [firstMembership] = await db
      .select({
        company: companies,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(
        and(
          eq(companyMembers.userId, session.user.id),
          eq(companies.isActive, true)
        )
      )
      .limit(1);

    if (firstMembership) {
      currentCompany = {
        company: firstMembership.company,
        role: firstMembership.role,
        userId: session.user.id,
      };
    }
  }

  // Redirect to company dashboard
  if (currentCompany) {
    redirect(`/companies/${currentCompany.company.slug}/dashboard`);
  }

  // No companies found - redirect to setup or error page
  // For now, redirect to login (could be a "no companies" page)
  redirect("/login?error=no-company");
}
