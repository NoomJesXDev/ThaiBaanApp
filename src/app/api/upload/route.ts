import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate image mimetype
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP หรือ GIF เท่านั้น" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to Base64 Data URL so slips persist reliably in PostgreSQL even on Serverless (Vercel)
    const base64DataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Also try saving to public/uploads/slips in local development for convenience
    if (process.env.NODE_ENV !== "production") {
      try {
        const fileExt = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "slips");
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, uniqueName);
        await writeFile(filePath, buffer);
      } catch {
        // Ignore read-only filesystem errors; base64DataUrl will be used
      }
    }

    return NextResponse.json({ success: true, url: base64DataUrl });
  } catch (err: unknown) {
    console.error("Upload Error", err);
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
