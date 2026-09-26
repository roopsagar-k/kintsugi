"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, KanbanSquare, PlayCircle, FolderGit2, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { KintsugiMark } from "@/components/kintsugi-logo"
import { project } from "@/lib/mock-data"

const nav = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard },
  { title: "Board", href: "/board", icon: KanbanSquare },
  { title: "Runs", href: "/runs", icon: PlayCircle },
  { title: "Projects", href: "/projects", icon: FolderGit2 },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/overview" />}
              size="lg"
              className="!h-14 group-data-[collapsible=icon]:!p-0"
            >
              <KintsugiMark className="size-[36px]! shrink-0 group-data-[collapsible=icon]:size-8!" />
              <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">Kintsugi</span>
                <span className="text-xs text-muted-foreground">Autonomous QA</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={active} tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={project.name}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-xs font-bold text-white">
                SL
              </span>
              <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.baseUrl}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
