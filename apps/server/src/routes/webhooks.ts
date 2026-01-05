import { Hono } from "hono";
import { db } from "@bhvr-ecom/db";
import { order } from "@bhvr-ecom/db/schema/ecommerce";
import { eq } from "drizzle-orm";
import { env } from "@bhvr-ecom/env/server";

const webhooks = new Hono();

/**
 * POST /api/webhooks/mercadopago
 * Handle Mercado Pago payment notifications (IPN)
 * 
 * Mercado Pago sends notifications for payment status changes:
 * - payment.created
 * - payment.updated
 * 
 * Payment statuses:
 * - approved: Payment was approved
 * - pending: Payment is pending
 * - in_process: Payment is being processed
 * - rejected: Payment was rejected
 * - cancelled: Payment was cancelled
 * - refunded: Payment was refunded
 * - charged_back: Payment was charged back
 */
webhooks.post("/mercadopago", async (c) => {
  try {
    const body = await c.req.json();
    
    console.log("[Mercado Pago Webhook] Received notification:", body);

    // Get query parameters
    const searchParams = new URL(c.req.url).searchParams;
    const topic = searchParams.get("topic") || body.topic;
    const id = searchParams.get("id") || body.data?.id;

    if (!topic || !id) {
      console.error("[Mercado Pago Webhook] Missing topic or id");
      return c.json({ error: "Missing required parameters" }, 400);
    }

    // We only care about payment notifications
    if (topic !== "payment" && topic !== "merchant_order") {
      console.log(`[Mercado Pago Webhook] Ignoring topic: ${topic}`);
      return c.json({ status: "ignored" }, 200);
    }

    // Fetch payment details from Mercado Pago API
    const mercadoPagoAccessToken = env.MERCADO_PAGO_ACCESS_TOKEN;
    
    if (!mercadoPagoAccessToken) {
      console.error("[Mercado Pago Webhook] Access token not configured");
      return c.json({ error: "Mercado Pago not configured" }, 500);
    }

    // Fetch payment info
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      console.error("[Mercado Pago Webhook] Failed to fetch payment info");
      return c.json({ error: "Failed to fetch payment info" }, 500);
    }

    const payment = await paymentResponse.json();
    
    console.log("[Mercado Pago Webhook] Payment details:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
    });

    // Get order ID from external_reference
    const orderId = payment.external_reference;
    
    if (!orderId) {
      console.error("[Mercado Pago Webhook] No external reference in payment");
      return c.json({ error: "No order reference" }, 400);
    }

    // Find order in database
    const existingOrder = await db.query.order.findFirst({
      where: eq(order.id, orderId),
    });

    if (!existingOrder) {
      console.error(`[Mercado Pago Webhook] Order not found: ${orderId}`);
      return c.json({ error: "Order not found" }, 404);
    }

    // Map Mercado Pago status to our order status
    let newStatus = existingOrder.status;
    let paymentStatus = payment.status;
    const paidAt = payment.date_approved ? new Date(payment.date_approved) : null;

    switch (payment.status) {
      case "approved":
        newStatus = "paid";
        break;
      case "pending":
      case "in_process":
      case "in_mediation":
        newStatus = "pending";
        break;
      case "rejected":
      case "cancelled":
        newStatus = "cancelled";
        break;
      case "refunded":
      case "charged_back":
        newStatus = "refunded";
        break;
      default:
        console.warn(`[Mercado Pago Webhook] Unknown payment status: ${payment.status}`);
    }

    // Update order in database
    await db
      .update(order)
      .set({
        status: newStatus,
        paymentStatus,
        paymentId: payment.id.toString(),
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId));

    console.log(`[Mercado Pago Webhook] Order ${orderId} updated to status: ${newStatus}`);

    // TODO: Send confirmation email to customer
    // TODO: Reduce product stock if status = "paid"
    // TODO: Clear cart if status = "paid"

    return c.json({ status: "processed", orderId, orderStatus: newStatus });
  } catch (error) {
    console.error("[Mercado Pago Webhook] Error processing webhook:", error);
    return c.json(
      { error: "Failed to process webhook", message: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

export default webhooks;
