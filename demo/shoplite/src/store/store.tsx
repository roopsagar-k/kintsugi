import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Product } from "@/lib/products"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface User {
  email: string
  name: string
}

interface StoreState {
  user: User | null
  login: (email: string) => void
  logout: () => void

  items: CartItem[]
  addToCart: (product: Product, quantity?: number) => void
  setQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void

  count: number
  subtotal: number
}

const StoreContext = createContext<StoreState | null>(null)

const CART_KEY = "shoplite.cart"
const USER_KEY = "shoplite.user"

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => load<User | null>(USER_KEY, null))
  const [items, setItems] = useState<CartItem[]>(() => load<CartItem[]>(CART_KEY, []))

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  }, [user])

  const login = useCallback((email: string) => {
    const name = email.split("@")[0]?.replace(/[._]/g, " ") || "Shopper"
    setUser({ email, name: name.replace(/\b\w/g, (c) => c.toUpperCase()) })
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        )
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity }]
    })
  }, [])

  const setQuantity = useCallback((id: string, quantity: number) => {
    // SEEDED BUG (cart lane): setting the quantity to 0 should remove the line item,
    // but this simply stores the new quantity — leaving a stray "0 ×" row in the cart.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  )

  const value: StoreState = {
    user,
    login,
    logout,
    items,
    addToCart,
    setQuantity,
    removeItem,
    clearCart,
    count,
    subtotal,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within a StoreProvider")
  return ctx
}
