export const PILOT_PAYMENT_ACKNOWLEDGEMENT = "TEST ONLY - NO MONEY MOVED";

type PilotPaymentBooking = {
  status: string;
  renterDealConfirmedAt: Date | null;
  hostDealConfirmedAt: Date | null;
};

export function assertPilotPaymentAllowed(input: {
  appMode: string;
  acknowledgement: string;
  booking: PilotPaymentBooking;
  agreementAccepted: boolean;
}): void {
  if (input.appMode !== "pilot") throw new Error("Pilot payment verification is available only in pilot mode.");
  if (input.acknowledgement !== PILOT_PAYMENT_ACKNOWLEDGEMENT) throw new Error("Confirm that this is a test and no money moved.");
  if (input.booking.status !== "APPROVED_FOR_PAYMENT") throw new Error("Booking must be approved and awaiting payment.");
  if (!input.booking.renterDealConfirmedAt || !input.booking.hostDealConfirmedAt) throw new Error("Renter and host must both confirm the deal.");
  if (!input.agreementAccepted) throw new Error("Renter and host must both accept the current agreement.");
}
