import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    if (!clientId || !secret) {
      return NextResponse.json({ error: "Missing PayPal credentials" }, { status: 500 });
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

    // Amount is hardcoded for now
    const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: "85.00" },
          },
        ],
        application_context: {
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
        },
      }),
    });

    const data = await res.json();

    const approveLink = data.links?.find(link => link.rel === "approve")?.href;

    if (!approveLink) {
      return NextResponse.json({ error: "Failed to get approval link" }, { status: 500 });
    }

    return NextResponse.json({ approveLink });
  } catch (err) {
    console.error("PayPal error:", err);
    return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
  }
}
