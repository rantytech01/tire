export type Product = {
  slug: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  size: string;
  width: number;
  aspect: number;
  rim: number;
  price: number;
  oldPrice?: number;
  stock: number;
  rating: number;
  image: string;
  description: string;
  specs: { label: string; value: string }[];
};

export const VEHICLES: Record<string, string[]> = {
  Toyota: ["Probox", "Fielder", "Prado", "Hilux", "Harrier", "Land Cruiser V8"],
  Nissan: ["Note", "X-Trail", "Navara", "Patrol"],
  Subaru: ["Forester", "Impreza", "Outback"],
  Mazda: ["Demio", "CX-5", "Axela"],
  Mitsubishi: ["Pajero", "Outlander", "L200"],
  Isuzu: ["D-Max", "NQR", "FRR"],
  Mercedes: ["C200", "Sprinter", "Actros"],
  Volkswagen: ["Golf", "Polo", "Touareg"],
};

export const formatKES = (n: number) =>
  `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
