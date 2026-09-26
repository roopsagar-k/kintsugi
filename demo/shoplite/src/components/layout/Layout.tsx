import { Outlet } from "react-router-dom"
import { Header } from "./Header"

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ShopLite. A demo storefront.</p>
          <p>Built for testing with Kintsugi.</p>
        </div>
      </footer>
    </div>
  )
}
