import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react"
import { getProduct, formatPrice } from "@/lib/products"
import { useStore } from "@/store/store"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function Product() {
  const { id } = useParams()
  const product = getProduct(id)
  const { addToCart } = useStore()
  const [qty, setQty] = useState(1)

  useEffect(() => {
    // SEEDED BUG (ui lane): leftover debug logging that fires an error-level
    // console message on every product view. Should not be here.
    console.error("[product] analytics context missing — view not tracked")
  }, [id])

  if (!product) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <Link to="/" className={buttonVariants({ variant: "outline" })}>
          Back to shop
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className={cn("aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br", product.swatch)}>
          <img src={product.image} alt={product.name} className="size-full object-cover" />
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            {product.tag && <Badge variant="secondary">{product.tag}</Badge>}
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums" data-testid="detail-price">
            {formatPrice(product.price)}
          </p>
          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-10 text-center tabular-nums" data-testid="qty">
                {qty}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/*
              SEEDED BUG (visual lane): the primary Add to Cart button is hidden on
              mobile viewports via `max-md:hidden`, so on phones there is no way to
              add the item to the cart. Should be visible at every breakpoint.
            */}
            <Button
              size="lg"
              className="flex-1 max-md:hidden"
              data-testid="detail-add-to-cart"
              onClick={() => {
                addToCart(product, qty)
                toast.success(`${qty} × ${product.name} added to cart`)
              }}
            >
              <ShoppingCart className="size-4" />
              Add to cart
            </Button>
          </div>

          <Separator className="my-8" />

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Specifications
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <div key={spec.label} className="flex justify-between border-b py-2 text-sm">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
