import { describe, expect, it } from "vitest";
import { assertPilotPaymentAllowed, PILOT_PAYMENT_ACKNOWLEDGEMENT } from "../src/lib/pilot-payment";

const confirmedBooking = {
  status: "APPROVED_FOR_PAYMENT",
  renterDealConfirmedAt: new Date("2026-08-15T00:00:00.000Z"),
  hostDealConfirmedAt: new Date("2026-08-15T00:01:00.000Z")
};

describe("pilot payment rehearsal", () => {
  it("allows an explicit pilot-only transition after both confirmations and agreement acceptance", () => {
    expect(() => assertPilotPaymentAllowed({
      appMode: "pilot",
      acknowledgement: PILOT_PAYMENT_ACKNOWLEDGEMENT,
      booking: confirmedBooking,
      agreementAccepted: true
    })).not.toThrow();
  });

  it.each(["demo", "production"])("fails closed in %s mode", (appMode) => {
    expect(() => assertPilotPaymentAllowed({ appMode, acknowledgement: PILOT_PAYMENT_ACKNOWLEDGEMENT, booking: confirmedBooking, agreementAccepted: true })).toThrow(/pilot mode/i);
  });

  it("requires the exact no-money acknowledgement", () => {
    expect(() => assertPilotPaymentAllowed({ appMode: "pilot", acknowledgement: "paid", booking: confirmedBooking, agreementAccepted: true })).toThrow(/no money/i);
  });

  it("requires both deal confirmations, agreement acceptance, and approved-for-payment state", () => {
    expect(() => assertPilotPaymentAllowed({ appMode: "pilot", acknowledgement: PILOT_PAYMENT_ACKNOWLEDGEMENT, booking: { ...confirmedBooking, hostDealConfirmedAt: null }, agreementAccepted: true })).toThrow(/both confirm/i);
    expect(() => assertPilotPaymentAllowed({ appMode: "pilot", acknowledgement: PILOT_PAYMENT_ACKNOWLEDGEMENT, booking: confirmedBooking, agreementAccepted: false })).toThrow(/both accept/i);
    expect(() => assertPilotPaymentAllowed({ appMode: "pilot", acknowledgement: PILOT_PAYMENT_ACKNOWLEDGEMENT, booking: { ...confirmedBooking, status: "PAYMENT_SUBMITTED" }, agreementAccepted: true })).toThrow(/awaiting payment/i);
  });
});

