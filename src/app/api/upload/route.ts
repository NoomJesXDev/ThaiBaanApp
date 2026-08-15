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

    // Create unique filename
    const fileExt = file.name.split(".").pop();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
    
    // Directory path in public folder
    const uploadDir = path.join(process.cwd(), "public", "uploads", "slips");
    
    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // Return the relative URL
    const relativeUrl = `/uploads/slips/${uniqueName}`;
    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (err: any) {
    console.error("Upload Error", err);
    return NextResponse.json({ error: err.message || "Failed to upload file" }, { status: 500 });
  }
}
