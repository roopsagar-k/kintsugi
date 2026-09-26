import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { Product } from "@/pages/Product"
import { Cart } from "@/pages/Cart"
import { Checkout } from "@/pages/Checkout"
import { OrderConfirmation } from "@/pages/OrderConfirmation"
import { Login } from "@/pages/Login"
import { Account } from "@/pages/Account"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  )
}

export default App
