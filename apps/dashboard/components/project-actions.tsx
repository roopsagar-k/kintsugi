"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProject, deleteProject, rotateApiKey } from "@/lib/actions"

function KeyBlock({ apiKey }: { apiKey: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Copy this key into <code className="rounded bg-muted px-1">.bob/mcp.json</code> — it
        won&apos;t be shown again.
      </p>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">
          {apiKey}
        </code>
        <Button
          size="icon"
          variant="outline"
          aria-label="Copy key"
          className="shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(apiKey)
            toast.success("Copied to clipboard")
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function NewProjectButton() {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [createdKey, setCreatedKey] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [baseUrl, setBaseUrl] = React.useState("http://localhost:5173")

  function reset(v: boolean) {
    setOpen(v)
    if (!v) {
      setCreatedKey(null)
      setName("")
      setBaseUrl("http://localhost:5173")
    }
  }

  async function submit() {
    setBusy(true)
    const res = await createProject(name, baseUrl)
    setBusy(false)
    if (res.ok && res.apiKey) {
      setCreatedKey(res.apiKey)
      toast.success("Project created")
    } else {
      toast.error(res.message ?? "Could not create project.")
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New project
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-w-md">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Project created</DialogTitle>
                <DialogDescription>Your project is ready and its API key is below.</DialogDescription>
              </DialogHeader>
              <KeyBlock apiKey={createdKey} />
              <DialogFooter>
                <Button onClick={() => reset(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New project</DialogTitle>
                <DialogDescription>Connect an app under test to Kintsugi.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="np-name">Name</Label>
                  <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ShopLite" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="np-url">Base URL</Label>
                  <Input id="np-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => reset(false)}>
                  Cancel
                </Button>
                <Button disabled={busy || !name.trim()} onClick={submit}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function del() {
    setBusy(true)
    const res = await deleteProject(projectId)
    setBusy(false)
    setOpen(false)
    if (res.ok) {
      toast.success(`Deleted "${projectName}"`, {
        description: `Removed ${res.deleted ?? 0} document${res.deleted === 1 ? "" : "s"} (project, key, runs, tickets).`,
      })
      router.refresh()
    } else {
      toast.error(res.message ?? "Could not delete the project.")
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" /> Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{projectName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently deletes the project, its API key, and all of its runs, results,
              and tickets. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={del}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RotateKeyButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [key, setKey] = React.useState<string | null>(null)

  async function rotate() {
    setBusy(true)
    const res = await rotateApiKey(projectId)
    setBusy(false)
    if (res.ok && res.apiKey) {
      setKey(res.apiKey)
      setOpen(true)
      toast.success("API key rotated")
    } else {
      toast.error(res.message ?? "Could not rotate the key.")
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy} onClick={rotate}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Rotate
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setKey(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>The previous key no longer works.</DialogDescription>
          </DialogHeader>
          {key && <KeyBlock apiKey={key} />}
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
