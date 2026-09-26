import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { formatPrice } from "@/lib/products"
import { useStore } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const mockOrders = [
  { id: "SL-482013", date: "12 Sep 2026", total: 268, status: "Delivered" },
  { id: "SL-471902", date: "28 Aug 2026", total: 89, status: "Delivered" },
]

export function Account() {
  const { user, logout } = useStore()
  const navigate = useNavigate()

  // SEEDED BUG (auth lane): this page renders account details with no
  // authentication guard, so it is reachable even when no user is signed in.
  // A logged-out visitor should be redirected to /login instead.

  return (
    <div className="flex flex-col gap-6" data-testid="account-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
        <Button
          variant="outline"
          data-testid="logout"
          onClick={() => {
            logout()
            navigate("/")
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium" data-testid="account-name">
              {user?.name ?? "Guest"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium" data-testid="account-email">
              {user?.email ?? "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          {mockOrders.map((order, i) => (
            <div key={order.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{order.id}</p>
                  <p className="text-muted-foreground">{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatPrice(order.total)}</p>
                  <p className="text-muted-foreground">{order.status}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
