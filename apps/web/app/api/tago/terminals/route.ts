import { handleTagoLookup } from "../_lookup";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return handleTagoLookup("terminals", request);
}
