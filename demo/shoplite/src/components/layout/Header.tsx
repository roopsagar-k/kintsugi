import { Link, NavLink } from "react-router-dom"
import { ShoppingCart, User } from "lucide-react"
import { useStore } from "@/store/store"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const nav = [
  { to: "/", label: "Shop" },
  { to: "/cart", label: "Cart" },
]

export function Header() {
  const { count, user } = useStore()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2" data-testid="logo">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">ShopLite</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/cart"
            data-testid="cart-link"
            className="relative flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <Badge
                data-testid="cart-count"
                className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 tabular-nums"
              >
                {count}
              </Badge>
            )}
          </Link>
          <Link
            to={user ? "/account" : "/login"}
            data-testid="account-link"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={user ? "Account" : "Sign in"}
          >
            <User className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
