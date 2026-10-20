import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate image mimetype
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to Base64 Data URL so slips persist reliably in PostgreSQL even on Serverless (Vercel)
    const base64DataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Also try saving to public/uploads/slips in local development for convenience
    if (process.env.NODE_ENV !== "production") {
      try {
        const fileExt = file.name.split(".").pop() || "jpg";
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
  } catch (err: any) {
    console.error("Upload Error", err);
    return NextResponse.json({ error: err.message || "Failed to upload file" }, { status: 500 });
  }
}
