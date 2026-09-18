import { headers, cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";

export async function getServerUser() {
  const reqHeaders = await headers();
  let userId = reqHeaders.get("x-user-id");
  let email = reqHeaders.get("x-user-email") || "";
  let community_id = reqHeaders.get("x-user-community-id") || "";
  let role = reqHeaders.get("x-user-role") || "";

  // Fallback: Read directly from session cookie if headers were not propagated
  if (!userId) {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        userId = payload.userId;
        email = payload.email;
        community_id = payload.communityId;
        role = payload.role;
      }
    }
  }

  if (!userId) return null;
  return {
    id: userId,
    email,
    community_id,
    role,
  };
}

