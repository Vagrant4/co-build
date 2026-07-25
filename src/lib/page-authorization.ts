import type { User, UserRole } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { getOptionalUser } from "./authorization";

export async function requirePageUser(): Promise<User> {
  const user = await getOptionalUser();
  if (!user) unauthorized();
  if (user.suspended) forbidden();
  return user;
}

export async function requirePageRole(role: UserRole): Promise<User> {
  const user = await requirePageUser();
  if (user.role !== role) forbidden();
  return user;
}
