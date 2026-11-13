import { pathToFileURL } from "node:url";

export const siteOrigin = "https://loteria-lab-lipefxo.lipefxo.chatgpt.site";

/** The credential is only sent to the existing Site, never across redirects. */
export async function checkHostedData(input, fetcher = fetch) {
  if (input?.url !== siteOrigin || typeof input.token !== "string" || !input.token.trim())
    throw new Error("Provide the current Site URL and service credential through stdin.");
  async function request(path) {
    const response = await fetcher(`${siteOrigin}${path}`, {
      headers: { "OAI-Sites-Authorization": `Bearer ${input.token}`, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`${path.split("?")[0]} returned HTTP ${response.status}.`);
    try { return await response.json(); }
    catch { throw new Error("Hosted endpoint returned invalid JSON."); }
  }
  if (input.refresh === true) {
    const refreshed = await request("/api/draws?refresh=1");
    if (refreshed.freshness?.status !== "current")
      throw new Error("Official refresh did not reach current status; inspect ingestion diagnostics.");
  }
  const health = await request("/api/health");
  if (health?.status !== "current") throw new Error("Persisted ingestion health is not current.");
  const checked = typeof health.checkedAt === "string" ? Date.parse(health.checkedAt) : NaN;
  if (!Number.isFinite(checked) || !Number.isSafeInteger(health.lastIncludedContest) || health.lastIncludedContest <= 0 || health.lastIncludedContest !== health.latestAvailableContest)
    throw new Error("Hosted health response has invalid metadata.");
  return {
    status: "current",
    checkedAt: new Date(checked).toISOString(),
    lastIncludedContest: health.lastIncludedContest,
    latestAvailableContest: health.latestAvailableContest,
  };
}

async function readInput() {
  return new Promise((resolve, reject) => {
    let input = "";
    const terminal = process.stdin.isTTY;
    const finish = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.removeListener("end", finish);
      if (terminal) process.stdin.setRawMode(false);
      process.stdin.pause();
      try { resolve(JSON.parse(input)); }
      catch { reject(new Error("Expected one JSON object on stdin.")); }
    };
    const onData = (chunk) => {
      input += chunk;
      if (input.includes("\n") || input.includes("\r")) finish();
    };
    if (terminal) {
      process.stdin.setRawMode(true);
      process.stderr.write("Ready for Site health JSON on stdin (input is hidden).\n");
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", onData);
    process.stdin.once("end", finish);
    process.stdin.resume();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await checkHostedData(await readInput())));
  } catch (error) {
    // Never echo input, response bodies, headers, or an underlying network error.
    console.error(error instanceof Error && !error.cause ? error.message : "Hosted check failed.");
    process.exitCode = 1;
  }
}
