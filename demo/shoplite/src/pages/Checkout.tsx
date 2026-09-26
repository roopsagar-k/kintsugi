import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatPrice } from "@/lib/products"
import { useStore } from "@/store/store"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface Errors {
  email?: string
  name?: string
  address?: string
  city?: string
  zip?: string
}

export function Checkout() {
  const { items, subtotal, clearCart } = useStore()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<Errors>({})

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">Nothing to check out</p>
        <Link to="/" className={buttonVariants()}>
          Browse products
        </Link>
      </div>
    )
  }

  const shipping = subtotal >= 50 ? 0 : 6
  const total = subtotal + shipping

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const next: Errors = {}

    // SEEDED BUG (ui/edge lane): the email field is never validated, so an order
    // can be placed with an empty or malformed email. The other fields are
    // validated correctly — only the email check is missing.
    if (!String(form.get("name") ?? "").trim()) next.name = "Name is required"
    if (!String(form.get("address") ?? "").trim()) next.address = "Address is required"
    if (!String(form.get("city") ?? "").trim()) next.city = "City is required"
    if (!String(form.get("zip") ?? "").trim()) next.zip = "ZIP is required"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    clearCart()
    navigate("/order-confirmation")
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field
                id="email"
                name="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="name" name="name" label="Full name" error={errors.name} />
              </div>
              <div className="sm:col-span-2">
                <Field id="address" name="address" label="Street address" error={errors.address} />
              </div>
              <Field id="city" name="city" label="City" error={errors.city} />
              <Field id="zip" name="zip" label="ZIP / Postal code" error={errors.zip} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="tabular-nums">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
            <Button type="submit" className="mt-3 w-full" data-testid="place-order">
              Place order
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function Field({
  id,
  name,
  label,
  type = "text",
  placeholder,
  error,
}: {
  id: string
  name: string
  label: string
  type?: string
  placeholder?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        data-testid={id}
        aria-invalid={!!error}
      />
      {error && (
        <p className="text-sm text-destructive" data-testid={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
