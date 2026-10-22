import nodemailer, { type SendMailOptions } from "nodemailer";
import { createBookingDocument, type BookingDocumentData } from "./booking-documents";

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function sendConfiguredEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: SendMailOptions["attachments"];
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || smtpUser,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

function bookingEmailLayout(
  title: string,
  name: string,
  message: string,
  ticketNumber: string,
  primaryLink: string,
  primaryLabel: string,
  secondaryLink: string,
  secondaryLabel: string,
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:28px;background:#f3f5f7;color:#17202b;font:16px/1.6 Arial,sans-serif">
<div style="max-width:640px;margin:auto;background:white;border:1px solid #e2e7ed;border-radius:18px;overflow:hidden">
<div style="padding:22px;text-align:center;background:#102c35;color:white;font-weight:bold;letter-spacing:.12em">WHITE DENTAL CLINIC</div>
<div style="padding:30px"><p style="margin-top:0;color:#126d69;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase">Dallas · Thoughtful dental care</p>
<h1 style="color:#102c35">${escapeHtml(title)}</h1><p>Hello ${escapeHtml(name)},</p><p>${message}</p>
<p><strong>Booking number: ${escapeHtml(ticketNumber)}</strong></p>
<p><a href="${escapeHtml(primaryLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#126d69;color:white;text-decoration:none;font-weight:bold">${escapeHtml(primaryLabel)}</a></p>
<p><a href="${escapeHtml(secondaryLink)}" style="display:inline-block;padding:11px 18px;border:1px solid #126d69;border-radius:999px;color:#126d69;text-decoration:none;font-weight:bold">${escapeHtml(secondaryLabel)}</a></p>
<p>If you don’t see a message from us after completing payment, please check your spam or junk folder.</p>
<p>Warm regards,<br><strong>White Dental Clinic</strong></p></div></div></body></html>`;
}

export async function sendBookingConfirmationEmail(
  booking: BookingDocumentData,
) {
  const paymentLink = `${appUrl()}/pay?ticketNumber=${encodeURIComponent(booking.ticketNumber)}`;
  const trackingLink = `${appUrl()}/track?ticketNumber=${encodeURIComponent(booking.ticketNumber)}`;
  await sendConfiguredEmail({
    to: booking.email,
    subject: `Booking pending payment · ${booking.ticketNumber} · White Dental Clinic`,
    html: bookingEmailLayout(
      "Your booking is pending payment",
      booking.name,
      `We have received your request for ${escapeHtml(booking.service)} on ${escapeHtml(booking.date)} at ${escapeHtml(booking.time)}. Your 30% booking fee is $${booking.depositAmount.toFixed(2)} of the $${booking.totalCost.toFixed(2)} service cost. The fee reserves your requested appointment time and helps our team prepare for your visit; it is credited toward the service total, with the remaining balance due at the clinic. Your appointment is confirmed and your ticket is issued only after the payment is verified.`,
      booking.ticketNumber,
      paymentLink,
      "Verify your email and pay booking fee",
      trackingLink,
      "Track booking status",
    ),
    text: `Hello ${booking.name},\n\nWhite Dental Clinic received your request for ${booking.service} on ${booking.date} at ${booking.time}.\nService description: ${booking.description}\nTotal service cost: $${booking.totalCost.toFixed(2)}\n30% booking fee: $${booking.depositAmount.toFixed(2)}\n\nThe booking fee reserves your requested appointment time and helps our team prepare for your visit. It is credited toward the service total; the remaining balance is due at the clinic. Your appointment will be confirmed and your booking ticket issued after payment is verified.\n\nBooking number: ${booking.ticketNumber}\nVerify your email and pay: ${paymentLink}\nTrack booking status: ${trackingLink}\n\nIf you don't see our email, please check your spam or junk folder.\n\nWhite Dental Clinic`,
  });
}

export async function sendPaymentConfirmationEmail(
  booking: BookingDocumentData,
) {
  const link = `${appUrl()}/track?ticketNumber=${encodeURIComponent(booking.ticketNumber)}`;
  const ticketLink = `${appUrl()}/api/bookings/${encodeURIComponent(booking.ticketNumber)}/ticket`;
  const ticket = createBookingDocument(booking, "ticket");
  const receipt = createBookingDocument(booking, "receipt");
  await sendConfiguredEmail({
    to: booking.email,
    subject: `Payment confirmed for ${booking.ticketNumber} · White Dental Clinic`,
    html: bookingEmailLayout(
      "Your booking fee is confirmed",
      booking.name,
      `Welcome to White Dental Clinic. Your $${booking.depositAmount.toFixed(2)} booking fee for ${escapeHtml(booking.service)} has been verified. Your appointment is confirmed for ${escapeHtml(booking.date)} at ${escapeHtml(booking.time)}. Your booking ticket and payment receipt are attached.`,
      booking.ticketNumber,
      link,
      "Track your confirmed booking",
      ticketLink,
      "Download booking ticket",
    ),
    text: `Hello ${booking.name},\n\nWelcome to White Dental Clinic. Your $${booking.depositAmount.toFixed(2)} booking fee for ${booking.service} has been verified. Your appointment is confirmed for ${booking.date} at ${booking.time}.\nBooking number: ${booking.ticketNumber}\n\nYour booking ticket and payment receipt are attached. Track your booking or download them again: ${link}\nIf you don't see our email, please check your spam or junk folder.\n\nWhite Dental Clinic`,
    attachments: [
      {
        filename: `White-Dental-Clinic-ticket-${booking.ticketNumber}.html`,
        content: ticket,
        contentType: "text/html",
      },
      {
        filename: `White-Dental-Clinic-receipt-${booking.ticketNumber}.html`,
        content: receipt,
        contentType: "text/html",
      },
    ],
  });
}

export async function sendVisitorQuestionResponseEmail({
  name,
  email,
  question,
  response,
}: {
  name: string;
  email: string;
  question: string;
  response: string;
}) {
  const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";
  await sendConfiguredEmail({
    to: email,
    subject: "A reply from White Dental Clinic",
    html: `<!doctype html><html lang="en"><body style="font:16px/1.6 Arial,sans-serif;color:#17202b"><h1>White Dental Clinic</h1><p>${greeting}</p><p>${escapeHtml(response).replace(/\n/g, "<br>")}</p><hr><p><strong>Your message</strong></p><p>${escapeHtml(question).replace(/\n/g, "<br>")}</p></body></html>`,
    text: `${name ? `Hello ${name},` : "Hello,"}\n\n${response}\n\nYour message:\n${question}\n\nWhite Dental Clinic`,
  });
}
