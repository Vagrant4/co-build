import type { Prisma, UserRole } from "@prisma/client";

export class DuplicateAccountError extends Error {
  constructor() {
    super("An account already exists for this sign-in. Sign in instead or contact support.");
    this.name = "DuplicateAccountError";
  }
}

type AccountStore = Pick<Prisma.TransactionClient["user"], "findFirst" | "create" | "update">;

export type RegistrationInput = {
  id: string;
  authProviderId: string;
  email: string;
  role: Extract<UserRole, "RENTER" | "HOST">;
  fullName: string;
  companyName: string;
  uen: string | null;
  workType: string | null;
};

export async function registerAccount(store: AccountStore, input: RegistrationInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await store.findFirst({
    where: { OR: [{ email: normalizedEmail }, { authProviderId: input.authProviderId }] },
    select: { id: true }
  });
  if (existing) throw new DuplicateAccountError();

  try {
    return await store.create({
      data: {
      id: input.id,
      authProviderId: input.authProviderId,
      email: normalizedEmail,
      role: input.role,
      fullName: input.fullName,
      mobile: "",
      companyName: input.companyName,
      uen: input.uen,
      workType: input.workType,
      verificationStatus: "PENDING",
      platformSubscriptionStatus: "UNPAID",
      suspended: false
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new DuplicateAccountError();
    }
    throw error;
  }
}

export async function updateOwnProfile(
  store: AccountStore,
  userId: string,
  input: { fullName: string; companyName: string; uen: string | null; workType: string | null }
) {
  return store.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      companyName: input.companyName,
      uen: input.uen,
      workType: input.workType
    }
  });
}
