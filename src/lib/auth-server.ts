import { headers } from "next/headers";

export async function getServerUser() {
  const reqHeaders = await headers();
  const userId = reqHeaders.get("x-user-id");
  if (!userId) return null;
  return {
    id: userId,
    email: reqHeaders.get("x-user-email") || "",
    community_id: reqHeaders.get("x-user-community-id") || "",
    role: reqHeaders.get("x-user-role") || "",
  };
}
