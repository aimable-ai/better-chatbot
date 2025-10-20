"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { ChevronDown, Layers } from "lucide-react";

type SpaceItem = {
  id: string;
  name: string;
  status?: string;
};

function getCurrentSpaceIdFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )current-space-id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function SpaceSelector() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/spaces")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const raw = (d?.spaces ?? []) as any[];
        // handle both shapes: direct spaces or joined with members
        const normalized = raw
          .map((row, idx) => {
            // Try common shapes from Drizzle joins or plain selects
            const s =
              row?.SpaceSchema ||
              row?.space ||
              row?.Space ||
              row?.spaces ||
              row;
            const id = s?.id ?? row?.id;
            const name = s?.name ?? row?.name ?? `Workspace ${idx + 1}`;
            const status = s?.status ?? row?.status ?? "active";
            if (!id) return null;
            return { id, name, status } as SpaceItem;
          })
          .filter(Boolean) as SpaceItem[];
        const active = normalized.filter((s) => s.status !== "deleted");
        setSpaces(active);
      })
      .catch(() => {});
    setCurrentId(getCurrentSpaceIdFromCookie());
    return () => {
      alive = false;
    };
  }, []);

  const currentSpace = useMemo(() => {
    return spaces.find((s) => s.id === currentId) || null;
  }, [spaces, currentId]);

  const setCurrent = (id: string) => {
    document.cookie = `current-space-id=${id}; path=/;`;
    setCurrentId(id);
    // Reload to propagate to server components and API calls
    window.location.reload();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="px-2 py-1 h-8 gap-2">
          <Layers className="size-4" />
          <span className="truncate max-w-52">
            {currentSpace?.name || "Select workspace"}
          </span>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {spaces.length === 0 ? (
          <DropdownMenuItem disabled>No workspaces available</DropdownMenuItem>
        ) : (
          spaces.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onClick={() => s.id !== currentId && setCurrent(s.id)}
              className="cursor-pointer flex items-center justify-between"
            >
              <span className="truncate">{s.name}</span>
              {s.status === "archived" && (
                <span className="text-xs text-amber-600 ml-2">Archived</span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SpaceSelector;


