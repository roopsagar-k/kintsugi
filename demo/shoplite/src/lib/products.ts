export interface Product {
  id: string
  name: string
  price: number
  category: string
  tag?: "New" | "Sale" | "Popular"
  blurb: string
  description: string
  /** Product photo URL. */
  image: string
  /** Tailwind gradient shown behind the photo while it loads / as a fallback. */
  swatch: string
  specs: { label: string; value: string }[]
}

const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`

export const products: Product[] = [
  {
    id: "aurora-lamp",
    name: "Aurora Desk Lamp",
    price: 89,
    category: "Lighting",
    tag: "New",
    blurb: "Warm, dimmable light with a machined aluminium body.",
    description:
      "The Aurora Desk Lamp brings soft, flicker-free light to any workspace. Its stepless dimmer runs from a gentle bedside glow to full task brightness, and the machined aluminium arm holds any angle you set.",
    image: IMG("1507473885765-e6ed057f782c"),
    swatch: "from-amber-200 to-orange-300",
    specs: [
      { label: "Material", value: "Anodised aluminium" },
      { label: "Brightness", value: "50–800 lumens" },
      { label: "Colour temp", value: "2700K warm white" },
      { label: "Warranty", value: "2 years" },
    ],
  },
  {
    id: "drift-headphones",
    name: "Drift Wireless Headphones",
    price: 179,
    category: "Audio",
    tag: "Popular",
    blurb: "40-hour battery, adaptive noise cancelling, feather-light.",
    description:
      "Drift pairs adaptive noise cancelling with a 40-hour battery so your day never skips a beat. Memory-foam ear cushions and a 250g frame keep them comfortable from the first track to the last.",
    image: IMG("1505740420928-5e560c06d30e"),
    swatch: "from-slate-300 to-slate-500",
    specs: [
      { label: "Battery", value: "40 hours" },
      { label: "Drivers", value: "40mm dynamic" },
      { label: "Weight", value: "250 g" },
      { label: "Connectivity", value: "Bluetooth 5.3" },
    ],
  },
  {
    id: "meridian-watch",
    name: "Meridian Automatic Watch",
    price: 349,
    category: "Accessories",
    tag: "Sale",
    blurb: "Self-winding movement with a sapphire crystal face.",
    description:
      "A self-winding automatic movement visible through the exhibition caseback, wrapped in brushed stainless steel and topped with scratch-resistant sapphire crystal. Water resistant to 100m.",
    image: IMG("1523275335684-37898b6baf30"),
    swatch: "from-teal-200 to-emerald-400",
    specs: [
      { label: "Movement", value: "Automatic, 42h reserve" },
      { label: "Case", value: "40mm stainless steel" },
      { label: "Glass", value: "Sapphire crystal" },
      { label: "Water resist", value: "100 m" },
    ],
  },
  {
    id: "canvas-backpack",
    name: "Canvas Everyday Backpack",
    price: 129,
    category: "Bags",
    blurb: "Water-resistant canvas with a padded 16\" laptop sleeve.",
    description:
      "Built from waxed water-resistant canvas with full-grain leather straps, the Everyday Backpack carries a 16-inch laptop, a change of clothes, and everything in between without looking like a hiking pack.",
    image: IMG("1553062407-98eeb64c6a62"),
    swatch: "from-stone-300 to-amber-700",
    specs: [
      { label: "Capacity", value: "22 litres" },
      { label: "Laptop", value: "Fits up to 16\"" },
      { label: "Material", value: "Waxed canvas" },
      { label: "Pockets", value: "6 total" },
    ],
  },
  {
    id: "pulse-keyboard",
    name: "Pulse Mechanical Keyboard",
    price: 149,
    category: "Desk",
    tag: "New",
    blurb: "Hot-swappable switches, aluminium plate, per-key RGB.",
    description:
      "The Pulse is a 75% mechanical keyboard with a gasket-mounted aluminium plate for a soft, consistent typing feel. Hot-swappable sockets let you change switches without a soldering iron.",
    image: IMG("1587829741301-dc798b83add3"),
    swatch: "from-indigo-200 to-violet-400",
    specs: [
      { label: "Layout", value: "75% (84 keys)" },
      { label: "Switches", value: "Hot-swappable" },
      { label: "Connection", value: "USB-C / 2.4GHz" },
      { label: "Backlight", value: "Per-key RGB" },
    ],
  },
  {
    id: "terra-bottle",
    name: "Terra Insulated Bottle",
    price: 34,
    category: "Outdoors",
    blurb: "Keeps drinks cold 24h, hot 12h. Leak-proof lid.",
    description:
      "Double-walled vacuum insulation keeps cold drinks cold for 24 hours and hot drinks hot for 12. The leak-proof lid and powder-coated finish are built for the trail and the commute alike.",
    image: IMG("1602143407151-7111542de6e8"),
    swatch: "from-sky-200 to-cyan-400",
    specs: [
      { label: "Capacity", value: "750 ml" },
      { label: "Cold", value: "24 hours" },
      { label: "Hot", value: "12 hours" },
      { label: "Material", value: "18/8 steel" },
    ],
  },
]

export function getProduct(id: string | undefined): Product | undefined {
  return products.find((p) => p.id === id)
}

export function formatPrice(cents: number): string {
  return `$${cents.toFixed(2)}`
}
