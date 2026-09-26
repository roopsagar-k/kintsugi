import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Login() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [error, setError] = useState("")

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")
    if (!email || !password) {
      setError("Enter your email and password to sign in.")
      return
    }
    login(email)
    navigate("/account")
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Any email and password works in this demo store.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" data-testid="login-email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" data-testid="login-password" />
            </div>
            {error && (
              <p className="text-sm text-destructive" data-testid="login-error">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" data-testid="login-submit">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
