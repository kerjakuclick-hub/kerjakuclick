export type ServiceVariant = {
  id: string;
  category: string;
  name: string;
  price: number;
  unit: string;
  duration: string;
  tier: "Fast" | "PRO";
};

export const services: ServiceVariant[] = [
  {
    id: "setrika-fast",
    category: "Setrika Pakaian",
    name: "Setrika Fast",
    price: 40000,
    unit: "20 Pcs / Paket",
    duration: "1 Jam",
    tier: "Fast",
  },
  {
    id: "setrika-pro",
    category: "Setrika Pakaian",
    name: "Setrika PRO",
    price: 75000,
    unit: "40 Pcs / Paket",
    duration: "2 Jam",
    tier: "PRO",
  },
  {
    id: "cleaning-fast",
    category: "Bersihkan Rumah",
    name: "Cleaning Fast",
    price: 45000,
    unit: "1 Rumah / Properti",
    duration: "1.5 Jam",
    tier: "Fast",
  },
  {
    id: "cleaning-pro",
    category: "Bersihkan Rumah",
    name: "Cleaning PRO",
    price: 80000,
    unit: "1 Rumah / Properti",
    duration: "2.5 Jam",
    tier: "PRO",
  },
  {
    id: "cuci-motor",
    category: "Cuci Kendaraan",
    name: "Cuci Motor",
    price: 35000,
    unit: "1 Motor",
    duration: "1 Jam",
    tier: "Fast",
  },
  {
    id: "cuci-mobil",
    category: "Cuci Kendaraan",
    name: "Cuci Mobil",
    price: 75000,
    unit: "1 Mobil",
    duration: "2 Jam",
    tier: "PRO",
  },
];

export const serviceCategories = Array.from(
  new Set(services.map((s) => s.category))
);

/**
 * Mencocokkan teks bebas (misalnya dari pesan WhatsApp: "Cleaning Fast",
 * atau "cleaning-fast") ke salah satu varian layanan yang terdaftar.
 * Dipakai oleh webhook Fonnte untuk menentukan total_price.
 */
export function findServiceByLabel(label: string): ServiceVariant | undefined {
  const normalized = label.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return services.find(
    (s) =>
      s.id === normalized ||
      s.name.toLowerCase() === label.trim().toLowerCase() ||
      s.name.toLowerCase().replace(/\s+/g, "-") === normalized
  );
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
