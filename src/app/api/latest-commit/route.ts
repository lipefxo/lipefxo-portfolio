import { NextResponse } from "next/server";
import { getLatestCommit } from "@/lib/latest-commit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const commit = await getLatestCommit();
  return NextResponse.json(commit, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
