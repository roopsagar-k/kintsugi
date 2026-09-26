import { products } from "@/lib/products"
import { ProductCard } from "@/components/ProductCard"

export function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl border bg-gradient-to-br from-muted/60 to-background p-8 sm:p-12">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-muted-foreground">New season · Free shipping over $50</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Well-made things for everyday life.
          </h1>
          <p className="mt-3 text-muted-foreground">
            A small, considered catalogue of objects we actually use — lighting, audio,
            desk gear and carry. No clutter, just the good stuff.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">All products</h2>
          <span className="text-sm text-muted-foreground">{products.length} items</span>
        </div>
        <div
          data-testid="product-grid"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
