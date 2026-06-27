alter table public.day_records
  add column if not exists breakfast_note text,
  add column if not exists lunch_note text,
  add column if not exists dinner_note text;
