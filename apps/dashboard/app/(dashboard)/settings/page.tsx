"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  // Canonical next-themes mount guard: avoids a hydration mismatch on the active ring.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), [])

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Appearance and integration settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how Kintsugi looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const active = mounted && theme === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-accent",
                    active && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <t.icon className="size-5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">watsonx.ai</CardTitle>
          <CardDescription>Model used to triage failures. Falls back to heuristics if unset.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wx-model">Model</Label>
            <Input id="wx-model" defaultValue="ibm/granite-4-h-small" readOnly />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wx-url">Endpoint</Label>
            <Input id="wx-url" defaultValue="https://us-south.ml.cloud.ibm.com" readOnly />
          </div>
          <p className="text-xs text-muted-foreground">
            Configured server-side via <code className="rounded bg-muted px-1">.env.local</code>{" "}
            (<code className="rounded bg-muted px-1">WATSONX_*</code>). Edit that file and restart
            the dashboard to apply changes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
          <CardDescription>Manage or delete projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create, rotate keys for, or delete a project from the{" "}
            <span className="font-medium text-foreground">Projects</span> page — each action is
            scoped to a specific project there.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
