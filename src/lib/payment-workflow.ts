export type PaymentWorkflowBookingStatus = "APPROVED_FOR_PAYMENT" | "PAYMENT_SUBMITTED" | "PAID_CONFIRMED";
export type PaymentWorkflowAction = "SUBMIT_PROOF" | "ADMIN_VERIFY" | "ADMIN_REJECT";

export function nextPaymentState(status: PaymentWorkflowBookingStatus, action: PaymentWorkflowAction): PaymentWorkflowBookingStatus {
  if (status === "APPROVED_FOR_PAYMENT" && action === "SUBMIT_PROOF") return "PAYMENT_SUBMITTED";
  if (status === "PAYMENT_SUBMITTED" && action === "ADMIN_VERIFY") return "PAID_CONFIRMED";
  if (status === "PAYMENT_SUBMITTED" && action === "ADMIN_REJECT") return "APPROVED_FOR_PAYMENT";
  throw new Error("Payment transition is not allowed.");
}
