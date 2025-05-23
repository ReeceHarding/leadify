# Leadify

An AI-powered lead generation platform for Reddit.

## Features

- AI-powered keyword generation
- Reddit lead discovery
- Automated comment generation
- Campaign management
- Real-time analytics

## Sponsors

If you are interested in sponsoring my repos, please contact me at [ads@takeoffai.org](mailto:ads@takeoffai.org).

Or sponsor me directly on [GitHub Sponsors](https://github.com/sponsors/mckaywrigley).

## Tech Stack

- IDE: [Cursor](https://www.cursor.com/)
- AI Tools: [V0](https://v0.dev/), [Perplexity](https://www.perplexity.com/)
- Frontend: [Next.js](https://nextjs.org/docs), [Tailwind](https://tailwindcss.com/docs/guides/nextjs), [Shadcn](https://ui.shadcn.com/docs/installation), [Framer Motion](https://www.framer.com/motion/introduction/)
- Backend: [Firebase](https://firebase.google.com/), [Firestore](https://firebase.google.com/docs/firestore), [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- Auth: [Clerk](https://clerk.com/)
- Payments: [Stripe](https://stripe.com/)
- Analytics: [PostHog](https://posthog.com/)

## Prerequisites

You will need accounts for the following services.

They all have free plans that you can use to get started.

- Create a [Cursor](https://www.cursor.com/) account
- Create a [GitHub](https://github.com/) account
- Create a [Firebase](https://firebase.google.com/) account
- Create a [Clerk](https://clerk.com/) account
- Create a [Stripe](https://stripe.com/) account
- Create a [PostHog](https://posthog.com/) account
- Create a [Vercel](https://vercel.com/) account

You will likely not need paid plans unless you are building a business.

## Environment Variables

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PORTAL_LINK=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your Firebase project and add the configuration to `.env.local`
4. Set up your Clerk, Stripe, and PostHog accounts and add the keys to `.env.local`
5. Run the development server: `npm run dev`

## Database Setup

This template uses Firebase Firestore as the database. The data structure is defined in `db/firestore/collections.ts`.

To set up Firebase:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (if using Firebase Auth alongside Clerk)
5. Enable Storage (for file uploads)
6. Copy your configuration to `.env.local`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
