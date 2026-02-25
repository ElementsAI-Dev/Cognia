# Webhook Patterns for Convex HTTP Actions

Complete examples for receiving and verifying webhooks from third-party services.

## Table of Contents

- [Stripe Webhook](#stripe-webhook)
- [Stripe Signature Verification](#stripe-signature-verification)
- [GitHub Webhook](#github-webhook)
- [Clerk Webhook (Svix)](#clerk-webhook-svix)
- [Clerk Signature Verification](#clerk-signature-verification)
- [Generic Webhook Pattern](#generic-webhook-pattern)

## Stripe Webhook

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text();

    try {
      await ctx.runAction(internal.stripe.verifyAndProcessWebhook, {
        body,
        signature,
      });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
```

## Stripe Signature Verification

```typescript
// convex/stripe.ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const verifyAndProcessWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await ctx.runMutation(internal.payments.handleCheckoutComplete, {
          sessionId: event.data.object.id,
          customerId: event.data.object.customer as string,
        });
        break;

      case "customer.subscription.updated":
        await ctx.runMutation(internal.subscriptions.handleUpdate, {
          subscriptionId: event.data.object.id,
          status: event.data.object.status,
        });
        break;
    }

    return null;
  },
});
```

## GitHub Webhook

```typescript
http.route({
  path: "/webhooks/github",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = request.headers.get("X-GitHub-Event");
    const signature = request.headers.get("X-Hub-Signature-256");

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text();

    await ctx.runAction(internal.github.processWebhook, {
      event: event ?? "unknown",
      body,
      signature,
    });

    return new Response("OK", { status: 200 });
  }),
});
```

## Clerk Webhook (Svix)

```typescript
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    const body = await request.text();

    try {
      await ctx.runAction(internal.clerk.verifyAndProcess, {
        body,
        svixId,
        svixTimestamp,
        svixSignature,
      });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Clerk webhook error:", error);
      return new Response("Webhook verification failed", { status: 400 });
    }
  }),
});
```

## Clerk Signature Verification

```typescript
// convex/clerk.ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Webhook } from "svix";

export const verifyAndProcess = internalAction({
  args: {
    body: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;
    const wh = new Webhook(webhookSecret);

    const event = wh.verify(args.body, {
      "svix-id": args.svixId,
      "svix-timestamp": args.svixTimestamp,
      "svix-signature": args.svixSignature,
    }) as { type: string; data: Record<string, unknown> };

    switch (event.type) {
      case "user.created":
        await ctx.runMutation(internal.users.create, {
          clerkId: event.data.id as string,
          email: (event.data.email_addresses as Array<{ email_address: string }>)[0]?.email_address,
          name: `${event.data.first_name} ${event.data.last_name}`,
        });
        break;

      case "user.updated":
        await ctx.runMutation(internal.users.update, {
          clerkId: event.data.id as string,
          email: (event.data.email_addresses as Array<{ email_address: string }>)[0]?.email_address,
          name: `${event.data.first_name} ${event.data.last_name}`,
        });
        break;

      case "user.deleted":
        await ctx.runMutation(internal.users.remove, {
          clerkId: event.data.id as string,
        });
        break;
    }

    return null;
  },
});
```

## Generic Webhook Pattern

Template for any webhook provider:

```typescript
http.route({
  path: "/webhooks/my-service",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Extract signature header (provider-specific)
    const signature = request.headers.get("X-Signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    // 2. Read body as text (needed for signature verification)
    const body = await request.text();

    // 3. Verify + process in an internal action (with "use node" for crypto)
    try {
      await ctx.runAction(internal.myService.verifyAndProcess, {
        body,
        signature,
      });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Webhook processing failed", { status: 400 });
    }
  }),
});
```

Key principles:
- Always read body as `text()` first (needed for signature verification)
- Verify signatures in `internalAction` with `"use node"` for crypto libraries
- Process events via `ctx.runMutation` for database writes
- Return 200 quickly; use `ctx.scheduler.runAfter(0, ...)` for heavy processing
- Log webhook events for debugging
