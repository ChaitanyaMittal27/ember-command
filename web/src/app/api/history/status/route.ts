import { isDatabaseConfigured } from "@/lib/db";

// Read the environment on each request, not at build time.
export const dynamic = "force-dynamic";

/** Whether the History tab has a database behind it. Never touches the database. */
export function GET(): Response {
  return Response.json({ configured: isDatabaseConfigured() });
}
