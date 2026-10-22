alter table public.bookings
  add column if not exists service_description text not null default '',
  add column if not exists booking_notes text,
  add column if not exists paid_at timestamptz,
  add column if not exists paypal_order_id text;

create unique index if not exists bookings_paypal_order_id_idx
  on public.bookings (paypal_order_id)
  where paypal_order_id is not null;
