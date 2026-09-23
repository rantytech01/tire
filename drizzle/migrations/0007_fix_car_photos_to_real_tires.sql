-- Migration 0007: The photo set introduced in 0001/0003 was supposed to be tyre
-- close-ups but several of the Unsplash IDs used actually resolve to full car
-- shots (steering wheel, whole vehicles). Replace the whole rotation with a
-- verified set of genuine tyre/tread photos (Pexels, free-to-use, no
-- attribution required) confirmed by their own photo descriptions.

UPDATE public.products SET image = CASE (
    -- stable per-row bucket, same rotation width (8) as the original seed
    ('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 8
  )
  WHEN 0 THEN 'https://images.pexels.com/photos/441103/pexels-photo-441103.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 1 THEN 'https://images.pexels.com/photos/21694/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800'
  WHEN 2 THEN 'https://images.pexels.com/photos/16685597/pexels-photo-16685597/free-photo-of-close-up-of-a-car-tire.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 3 THEN 'https://images.pexels.com/photos/34357290/pexels-photo-34357290/free-photo-of-close-up-of-car-tire-tread-with-detailed-pattern.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 4 THEN 'https://images.pexels.com/photos/9576099/pexels-photo-9576099.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 5 THEN 'https://images.pexels.com/photos/16685596/pexels-photo-16685596/free-photo-of-dunlop-text-on-wheel-rim.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN 6 THEN 'https://images.pexels.com/photos/34357288/pexels-photo-34357288/free-photo-of-close-up-of-stacked-car-tires-with-tread-patterns.jpeg?auto=compress&cs=tinysrgb&w=800'
  ELSE 'https://images.pexels.com/photos/37244886/pexels-photo-37244886/free-photo-of-pattern-of-stacked-tires-creating-an-abstract-texture.jpeg?auto=compress&cs=tinysrgb&w=800'
END
-- Only touch rows still on the old broken Unsplash rotation — leave any photo an
-- admin/manager/inventory user has since uploaded through the admin console alone.
WHERE image LIKE 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64%'
   OR image LIKE 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc%'
   OR image LIKE 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28%'
   OR image LIKE 'https://images.unsplash.com/photo-1611541086208-0a5f36f70eba%'
   OR image LIKE 'https://images.unsplash.com/photo-1609521263047-f8f205293f24%'
   OR image LIKE 'https://images.unsplash.com/photo-1616455579100-2ceaa4eb2d37%'
   OR image LIKE 'https://images.unsplash.com/photo-1580274455191-1c62238fa333%'
   OR image LIKE 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5%';
