import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { Product } from "@/lib/products"
import { formatPrice } from "@/lib/products"
import { useStore } from "@/store/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore()

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <Link to={`/product/${product.id}`} className="relative block overflow-hidden">
        <div className={cn("aspect-[4/3] w-full bg-gradient-to-br", product.swatch)}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        {product.tag && (
          <Badge
            variant={product.tag === "Sale" ? "destructive" : "secondary"}
            className="absolute left-3 top-3 shadow-sm"
          >
            {product.tag}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.category}
        </p>
        <Link to={`/product/${product.id}`}>
          <h3 className="font-medium leading-tight hover:underline">{product.name}</h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.blurb}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold tabular-nums" data-testid="product-price">
            {formatPrice(product.price)}
          </span>
          <Button
            size="sm"
            data-testid={`add-to-cart-${product.id}`}
            onClick={() => {
              addToCart(product)
              toast.success(`${product.name} added to cart`)
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
