import { NextRequest, NextResponse } from "next/server";

function getUrl(path: "misses" | "db-entries") {
    const base = path === "misses"
        ? process.env.LAB_MISSES_URL
        : process.env.LAB_DB_ENTRIES_URL;
    if (!base) throw new Error(`Missing env var for ${path}`);
    return base;
}

// GET /api/lab/misses  →  proxied a Lambda get_misses
export async function GET(request: NextRequest) {
    const search = request.nextUrl.searchParams.toString();
    const url = `${getUrl("misses")}${search ? `?${search}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

// POST /api/lab/misses  →  proxied a Lambda create_miss
export async function POST(request: NextRequest) {
    const body = await request.json();
    const res = await fetch(getUrl("misses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
