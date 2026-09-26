import { Link, useNavigate } from "react-router-dom"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { formatPrice, getProduct } from "@/lib/products"
import { useStore } from "@/store/store"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function Cart() {
  const { items, setQuantity, removeItem, subtotal } = useStore()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Add a few things to get started.</p>
        </div>
        <Link to="/" className={buttonVariants()}>
          Browse products
        </Link>
      </div>
    )
  }

  const shipping = subtotal >= 50 ? 0 : 6
  const total = subtotal + shipping

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-3" data-testid="cart-items">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid={`cart-row-${item.id}`}
              className="flex items-center gap-4 rounded-xl border bg-card p-4"
            >
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={getProduct(item.id)?.image}
                  alt={item.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${item.id}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatPrice(item.price)} each
                </p>
              </div>

              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Decrease quantity"
                  data-testid={`decrease-${item.id}`}
                  onClick={() => setQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span
                  className="w-10 text-center tabular-nums"
                  data-testid={`qty-${item.id}`}
                >
                  {item.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Increase quantity"
                  data-testid={`increase-${item.id}`}
                  onClick={() => setQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <span className="w-20 text-right font-medium tabular-nums" data-testid={`line-total-${item.id}`}>
                {formatPrice(item.price * item.quantity)}
              </span>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove item"
                data-testid={`remove-${item.id}`}
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums" data-testid="cart-subtotal">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="tabular-nums">
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums" data-testid="cart-total">
                {formatPrice(total)}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              data-testid="checkout-button"
              onClick={() => navigate("/checkout")}
            >
              Checkout
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
