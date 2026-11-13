import { env } from "cloudflare:workers";
import Dashboard from "../components/lab/dashboard";
import { runtimeService } from "../lib/lottery/runtime";

// D1 revisions and their last-check status must be read for every page request.
// The framework cannot infer dynamic rendering from a Cloudflare binding.
export const dynamic = "force-dynamic";

export default async function Home() {
  return <Dashboard initialData={await runtimeService(env.DB).get()} />;
}
