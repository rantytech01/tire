INSERT INTO public.categories (slug, name, blurb, sort_order) VALUES
('passenger', 'Passenger Car Tyres', 'Everyday comfort & grip', 0),
('suv', 'SUV & 4x4 Tyres', 'On-road and off-road', 1),
('truck', 'Truck Tyres', 'Heavy load, long haul', 2),
('bus', 'Bus Tyres', 'PSV-ready durability', 3),
('agricultural', 'Agricultural Tyres', 'Tractors & farm gear', 4),
('industrial', 'Industrial Tyres', 'Forklifts & plant', 5),
('performance', 'Performance Tyres', 'High-speed control', 6),
('wheels', 'Alloy Wheels', 'Style that fits', 7),
('batteries', 'Batteries', 'Reliable cold starts', 8),
('accessories', 'Accessories', 'Valves, jacks, tools', 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.brands (name) VALUES
('Bridgestone'), ('Michelin'), ('Yokohama'), ('Goodyear'), ('Dunlop'),
('Continental'), ('Pirelli'), ('BFGoodrich'), ('Hankook'), ('Whitegoose')
ON CONFLICT (name) DO NOTHING;

WITH seed(i, name, brand, category_slug, size, width, aspect, rim, price, old_price, stock) AS (
  VALUES
  (0, 'Turanza T005 Highway', 'Bridgestone', 'passenger', '205/55R16', 205, 55, 16, 14500, 16800, 42),
  (1, 'Ecopia EP150 City', 'Bridgestone', 'passenger', '185/65R15', 185, 65, 15, 11200, NULL, 60),
  (2, 'Primacy 4+ Comfort', 'Michelin', 'passenger', '195/65R15', 195, 65, 15, 13400, 15200, 28),
  (3, 'Latitude Tour HP', 'Michelin', 'suv', '235/60R18', 235, 60, 18, 26900, NULL, 16),
  (4, 'Geolandar A/T G015', 'Yokohama', 'suv', '265/65R17', 265, 65, 17, 31500, 34900, 22),
  (5, 'BluEarth-GT AE51', 'Yokohama', 'passenger', '205/55R16', 205, 55, 16, 13900, NULL, 35),
  (6, 'Wrangler AT Adventure', 'Goodyear', 'suv', '245/70R16', 245, 70, 16, 27800, 29900, 18),
  (7, 'EfficientGrip Performance', 'Goodyear', 'passenger', '215/55R17', 215, 55, 17, 17600, NULL, 24),
  (8, 'SP Sport LM705', 'Dunlop', 'passenger', '225/45R17', 225, 45, 17, 18900, 21500, 20),
  (9, 'Grandtrek AT5', 'Dunlop', 'suv', '265/60R18', 265, 60, 18, 33900, NULL, 11),
  (10, 'PremiumContact 7', 'Continental', 'performance', '225/45R17', 225, 45, 17, 21400, 23900, 14),
  (11, 'CrossContact LX2', 'Continental', 'suv', '255/65R17', 255, 65, 17, 29900, NULL, 15),
  (12, 'P Zero Sport', 'Pirelli', 'performance', '245/40R18', 245, 40, 18, 34500, 38900, 9),
  (13, 'Scorpion Verde', 'Pirelli', 'suv', '235/55R18', 235, 55, 18, 31200, NULL, 12),
  (14, 'All-Terrain T/A KO2', 'BFGoodrich', 'suv', '265/70R16', 265, 70, 16, 34900, 37500, 20),
  (15, 'Mud-Terrain T/A KM3', 'BFGoodrich', 'suv', '285/75R16', 285, 75, 16, 41200, NULL, 8),
  (16, 'Dynapro AT2', 'Hankook', 'suv', '245/75R16', 245, 75, 16, 26400, 28900, 26),
  (17, 'Kinergy Eco2', 'Hankook', 'passenger', '175/65R14', 175, 65, 14, 8900, 9900, 70),
  (18, 'R249 Long Haul Steer', 'Bridgestone', 'truck', '315/80R22.5', 315, 80, 22, 68900, NULL, 18),
  (19, 'X Multi Z Truck', 'Michelin', 'truck', '295/80R22.5', 295, 80, 22, 72500, 78900, 12),
  (20, 'Bus Coach RY023', 'Yokohama', 'bus', '275/70R22.5', 275, 70, 22, 64800, NULL, 10),
  (21, 'Farm Grip R1 Tractor', 'Continental', 'agricultural', '12.4R28', 124, 0, 28, 58900, NULL, 7),
  (22, 'Forklift Solid Pro', 'Continental', 'industrial', '7.00R12', 70, 0, 12, 24900, NULL, 14),
  (23, 'Vortex Matte Alloy 17"', 'Whitegoose', 'wheels', '17x7.5', 175, 0, 17, 22900, 25900, 16),
  (24, 'Track Gloss Alloy 18"', 'Whitegoose', 'wheels', '18x8', 180, 0, 18, 28900, NULL, 10),
  (25, 'MaxStart 74Ah Battery', 'Whitegoose', 'batteries', 'N70', 0, 0, 0, 15900, 17400, 30),
  (26, 'MaxStart 100Ah Battery', 'Whitegoose', 'batteries', 'N100', 0, 0, 0, 21900, NULL, 18),
  (27, 'Nitrogen Valve Kit', 'Whitegoose', 'accessories', 'Universal', 0, 0, 0, 1200, NULL, 120)
-- Tyre close-up photos (no cars in frame) — 8 images rotated across the 28 products
), imgs(k, url) AS (
  VALUES
  (0, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=70'),
  (1, 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=800&q=70'),
  (2, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=800&q=70'),
  (3, 'https://images.unsplash.com/photo-1611541086208-0a5f36f70eba?auto=format&fit=crop&w=800&q=70'),
  (4, 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=70'),
  (5, 'https://images.unsplash.com/photo-1616455579100-2ceaa4eb2d37?auto=format&fit=crop&w=800&q=70'),
  (6, 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?auto=format&fit=crop&w=800&q=70'),
  (7, 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=70')
)
INSERT INTO public.products (slug, name, sku, brand, category_slug, size, width, aspect, rim, price, old_price, cost_price, stock, rating, image, description)
SELECT
  trim(both '-' from regexp_replace(lower(s.brand || '-' || s.name), '[^a-z0-9]+', '-', 'g')),
  s.name,
  'WG-' || (1000 + s.i)::text,
  s.brand,
  s.category_slug,
  s.size,
  s.width, s.aspect, s.rim,
  s.price,
  s.old_price,
  round(s.price * 0.72, 2),
  s.stock,
  round((4.00 + (s.i % 10) * 0.09)::numeric, 2),
  imgs.url,
  s.brand || ' ' || s.name || ' in ' || s.size || '. Supplied and fitted by Whitegoose Tires Ltd with a genuine manufacturer warranty, free fitting and balancing at our Kenyan branches.'
FROM seed s JOIN imgs ON imgs.k = s.i % 8
ON CONFLICT (slug) DO NOTHING;