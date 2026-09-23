-- Migration 0009: Migration 0008 only rewrote rows still holding the very
-- first (Unsplash) placeholder photo. If a Supabase auto-migration already
-- ran the earlier, since-replaced version of that file — which pointed at
-- hotlinked Pexels stock photos instead of the bundled local ones — those
-- rows no longer match a `LIKE 'https://images.unsplash.com/%'` filter, so
-- they were left showing the wrong (non-category) photo indefinitely.
--
-- This migration is safe to (re)run any number of times: it forces every
-- seeded product back onto the correct category photo, and skips only rows
-- an admin/manager/inventory user has genuinely customised through the admin
-- console's photo uploader (those live in Supabase Storage, recognisable by
-- the `/storage/v1/object` path segment).

UPDATE public.products SET image = CASE category_slug
  WHEN 'passenger'    THEN '/product-passenger-tyre.jpg'
  WHEN 'suv'          THEN '/product-suv-tyre.jpg'
  WHEN 'truck'        THEN '/product-commercial-tyre.jpg'
  WHEN 'bus'          THEN '/product-commercial-tyre.jpg'
  WHEN 'agricultural' THEN '/product-agricultural-tyre.jpg'
  WHEN 'industrial'   THEN '/product-industrial-tyre.jpg'
  WHEN 'performance'  THEN '/product-passenger-tyre.jpg'
  WHEN 'wheels'       THEN '/product-alloy-wheel.jpg'
  WHEN 'batteries'    THEN '/product-battery-accessory.jpg'
  WHEN 'accessories'  THEN '/product-battery-accessory.jpg'
  ELSE image
END
WHERE image IS NULL
   OR image NOT LIKE '%/storage/v1/object%';
