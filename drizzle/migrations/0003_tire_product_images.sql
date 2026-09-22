-- Migration 0003: Back-fill tire/tread photos on all seeded products
-- Replaces any car/placeholder photos with verified tire close-up images from Unsplash.

UPDATE products SET image = CASE
  WHEN sku = 'BRI-T001' THEN 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop'
  WHEN sku = 'MIC-P001' THEN 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=600&auto=format&fit=crop'
  WHEN sku = 'GY-E001'  THEN 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&auto=format&fit=crop'
  WHEN sku = 'PIR-P001' THEN 'https://images.unsplash.com/photo-1611541086208-0a5f36f70eba?w=600&auto=format&fit=crop'
  WHEN sku = 'DUN-SP001' THEN 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&auto=format&fit=crop'
  WHEN sku = 'CON-UC001' THEN 'https://images.unsplash.com/photo-1616455579100-2ceaa4eb2d37?w=600&auto=format&fit=crop'
  WHEN sku = 'HAN-K115' THEN 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=600&auto=format&fit=crop'
  ELSE image  -- leave non-seeded rows unchanged
END
WHERE sku IN ('BRI-T001','MIC-P001','GY-E001','PIR-P001','DUN-SP001','CON-UC001','HAN-K115');
