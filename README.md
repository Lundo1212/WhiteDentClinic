This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
## Email configuration for automatic sending

This app is already wired to send customer emails with Nodemailer. To enable it:

1. In your Gmail account, create an App Password.
2. Put the real Gmail address and app password in the environment variables in `.env.local` or in Vercel's project settings.
3. Set `APP_URL` to the production domain for White Dental Clinic.
4. Use the same Gmail account in `SMTP_USER` and `EMAIL_FROM` unless you have a verified custom domain.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM="White Dental Clinic <your-gmail-address@gmail.com>"
APP_URL=https://your-production-domain.example
```

Add the same values in your Vercel project under Settings → Environment Variables so the live site can send booking confirmations, payment receipts, and admin replies automatically. The booking email is sent when a request is saved; the payment receipt is sent after PayPal confirms the booking fee. Appointment reminder emails are not currently scheduled.

Set a unique, high-entropy `ADMIN_ACCESS_KEY` in your local environment and Vercel project settings. The admin dashboard and its APIs reject access when this key is not configured; do not use a public/default key.

Visitor questions are saved in Supabase and can only be read or managed through the authenticated admin APIs. Apply the migrations in `supabase/migrations/` in timestamp order, including the question-reply/social-link migration and the public-access restriction migration. The admin can edit or clear supported social URLs; saved links appear as clickable icons in the homepage footer. Replies require `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` in Vercel. A reply is marked answered only after the email is accepted by the SMTP server and the database update succeeds.

All server-side database access requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) in Vercel. The server client does not fall back to a public/publishable key, since direct public access to visitor questions is revoked.

After a booking is saved, the customer receives a pending-payment email with a secure link to `/pay` and a link to `/track`. The booking form also opens `/pay` immediately after saving. Customers must verify the booking number with the email address used for booking before checkout. PayPal or eligible cards can pay the 30% deposit; only after PayPal confirms the expected amount is the appointment confirmed and a downloadable ticket generated. The confirmed ticket and payment receipt are emailed to the customer and can be downloaded from the tracker. Emails remind customers to check their spam or junk folder if they do not arrive.

For online bookings, configure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) and apply all Supabase migrations. Add at least one service with an image or video in the admin dashboard before customers can book. To enable checkout, also configure `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_ID`, and `PAYPAL_CLIENT_SECRET`; set `PAYPAL_BASE_URL=https://api-m.paypal.com` for live payments, since the default is PayPal sandbox. The client ID must be available to the browser, but the PayPal secret must remain server-only.

An admin can edit booking contact and appointment details, change a service only before checkout begins, edit or delete client questions, edit/delete services and media, reply to unanswered questions by email, and save or remove social links. Deleting bookings is restricted to unpaid bookings with no PayPal checkout in progress. Paid bookings remain in history and can be marked attended to archive them. Updating a saved question reply or booking does not send a new email; replies to unanswered questions are emailed when submitted.

## Gallery uploads on Vercel

Gallery images and videos are uploaded directly to Supabase Storage, and their public URLs are saved in the `gallery_items` table. The migrations in `supabase/migrations/` create the `bookings`, `visitor_questions`, and `gallery_items` tables, track admin replies, persist social links, and create the public `gallery-media` bucket. Apply every migration in timestamp order with the Supabase CLI, or run each migration in that order in the Supabase SQL Editor. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-side `SUPABASE_SERVICE_ROLE_KEY` in Vercel. The admin upload API also creates or configures the bucket on first use; set `SUPABASE_STORAGE_BUCKET` only if you want a different bucket name. The server-side key is required for bucket setup and database writes; never expose it as a `NEXT_PUBLIC_` variable.

Existing gallery entries stored only in the repository's local JSON file cannot be edited or deleted on Vercel; add them again through the admin dashboard so they are saved in the database.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
