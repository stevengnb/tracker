import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { uploadsDir } from "@/lib/db";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const dir = uploadsDir();
  const target = path.normalize(path.join(dir, ...parts));
  if (!target.startsWith(dir + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = fs.readFileSync(target);
    const ext = path.extname(target).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
