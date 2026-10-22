import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book an Appointment | White Dental Clinic",
  description:
    "Choose a clinic service, review the booking fee, and book a dental appointment with White Dental Clinic in Dallas, Texas.",
  alternates: {
    canonical: "/book",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function BookingLayout({ children }: LayoutProps<"/book">) {
  return children;
}