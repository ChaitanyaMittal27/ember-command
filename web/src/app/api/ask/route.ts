import { askResponse } from "@/lib/askApi";

// Read the environment on each request, not at build time.
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return askResponse(request);
}
