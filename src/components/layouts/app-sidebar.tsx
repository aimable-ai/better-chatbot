"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "ui/sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarAgents } from "./app-sidebar-agents";
import { AppSidebarThreads } from "./app-sidebar-threads";
import { SpaceSelector } from "@/components/spaces/space-selector";

import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";
import { AppSidebarUser } from "./app-sidebar-user";
import { BasicUser } from "app-types/user";

export function AppSidebar({
  user,
}: {
  user?: BasicUser;
}) {
  const userRole = user?.role;
  const router = useRouter();

  // Handle new chat shortcut (specific to main app)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openNewChat)) {
        e.preventDefault();
        router.push("/");
        router.refresh();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border/80"
    >
      <SidebarHeader>
        <div className="px-2 pt-1">
          <SpaceSelector />
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2 overflow-hidden relative">
        <div className="flex flex-col overflow-y-auto">
          <AppSidebarMenus user={user} />
          <AppSidebarAgents userRole={userRole} />
          <AppSidebarThreads />
        </div>
      </SidebarContent>
      <SidebarFooter className="flex flex-col items-stretch space-y-2">
        <AppSidebarUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
