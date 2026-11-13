import { env } from "cloudflare:workers";
import { healthResponse } from "../../../lib/lottery/health";

export function GET() {
  return healthResponse(env.DB);
}
