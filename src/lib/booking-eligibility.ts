export type BookingEligibleUser = {
  role: string;
  suspended: boolean;
  verificationStatus: string;
  platformSubscriptionStatus: string;
};

export function canCreateBooking(user: BookingEligibleUser): boolean {
  return user.role === "RENTER" &&
    !user.suspended &&
    user.verificationStatus === "APPROVED" &&
    user.platformSubscriptionStatus === "ACTIVE";
}

export function canHostOperate(user: BookingEligibleUser): boolean {
  return user.role === "HOST" &&
    !user.suspended &&
    user.verificationStatus === "APPROVED" &&
    user.platformSubscriptionStatus === "ACTIVE";
}
