-- Migration 0008: The photo set introduced in 0001/0003 was supposed to be tyre
-- close-ups but several of the Unsplash IDs used actually resolve to full car
-- shots (steering wheel, whole vehicles). Replace every seeded product's photo
-- with a real, category-correct product photo bundled with the app (served
-- from /public, so there is no dependency on an external image host).

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
-- Only touch rows still on the old broken Unsplash rotation from 0001/0003 —
-- leave any photo an admin/manager/inventory user has since uploaded through
-- the admin console alone.
WHERE image LIKE 'https://images.unsplash.com/%';
