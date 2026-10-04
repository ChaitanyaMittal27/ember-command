import { historyResponse } from "@/lib/historyApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return historyResponse(request, "daily");
}
