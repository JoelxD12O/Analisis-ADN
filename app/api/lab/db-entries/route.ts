import { NextRequest, NextResponse } from "next/server";

// GET /api/lab/db-entries  →  proxied a Lambda get_db_entries
export async function GET(request: NextRequest) {
    const base = process.env.LAB_DB_ENTRIES_URL;
    if (!base) return NextResponse.json({ error: "Missing LAB_DB_ENTRIES_URL" }, { status: 500 });

    const search = request.nextUrl.searchParams.toString();
    const url = `${base}${search ? `?${search}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

// POST /api/lab/db-entries → proxied a Lambda create_db_entry
export async function POST(request: NextRequest) {
    const base = process.env.LAB_DB_ENTRIES_URL;
    if (!base) return NextResponse.json({ error: "Missing LAB_DB_ENTRIES_URL" }, { status: 500 });

    const body = await request.json();
    const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
