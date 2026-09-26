import { Link } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function OrderConfirmation() {
  const orderNo = `SL-${Math.floor(100000 + Math.random() * 900000)}`
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center" data-testid="order-confirmation">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Order placed</h1>
        <p className="mt-1 text-muted-foreground">
          Thanks for your order. A confirmation is on its way.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Order number: <span className="font-medium text-foreground">{orderNo}</span>
        </p>
      </div>
      <Link to="/" className={buttonVariants()}>
        Continue shopping
      </Link>
    </div>
  )
}
