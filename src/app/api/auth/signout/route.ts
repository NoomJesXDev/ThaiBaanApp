import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/login";
  
  const response = NextResponse.redirect(url, { status: 302 });
  
  // Clear the session cookie
  response.cookies.set("session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/"
  });
  
  return response;
}
