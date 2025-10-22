"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "ui/command";
import { Avatar, AvatarFallback } from "ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import {
  ChevronDown,
  Building2,
  Archive,
  Check,
  LoaderCircle,
} from "lucide-react";
import { cn } from "lib/utils";
import { Dialog, DialogContent, DialogTitle } from "ui/dialog";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

type SpaceItem = {
  id: string;
  name: string;
  status?: string;
};

function getCurrentSpaceIdFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )current-space-id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getSpaceIcon(status?: string) {
  switch (status) {
    case "archived":
      return Archive;
    case "active":
    default:
      return Building2;
  }
}

function getSpaceInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SpaceSelector() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToSpace, setSwitchingToSpace] = useState<string | null>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
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
        setIsLoading(false);
      })
      .catch(() => {
        if (alive) {
          setIsLoading(false);
        }
      });
    setCurrentId(getCurrentSpaceIdFromCookie());
    return () => {
      alive = false;
    };
  }, []);

  const currentSpace = useMemo(() => {
    return spaces.find((s) => s.id === currentId) || null;
  }, [spaces, currentId]);

  const setCurrent = async (id: string) => {
    const space = spaces.find((s) => s.id === id);
    if (!space) return;

    setIsSwitching(true);
    setSwitchingToSpace(space.name);
    setOpen(false);

    // Update cookie
    document.cookie = `current-space-id=${id}; path=/;`;
    setCurrentId(id);

    // Invalidate space-scoped SWR caches so lists reload for the new space
    await Promise.all([
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/chat"),
        undefined,
        { revalidate: true },
      ),
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/thread"),
        undefined,
        { revalidate: true },
      ),
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/agent"),
        undefined,
        { revalidate: true },
      ),
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/archive"),
        undefined,
        { revalidate: true },
      ),
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/workflow"),
        undefined,
        { revalidate: true },
      ),
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/mcp"),
        undefined,
        { revalidate: true },
      ),
    ]);

    // Navigate to home page without refreshing
    router.push("/");

    // Close modal after a short delay to show the loading state
    setTimeout(() => {
      setIsSwitching(false);
      setSwitchingToSpace(null);
    }, 1000);
  };

  const SpaceIcon = getSpaceIcon(currentSpace?.status);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="justify-start gap-2 hover:bg-accent/50"
            style={{
              padding: "20px 5px 20px 10px",
              width: "242px",
              marginLeft: "-10px",
            }}
          >
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {isLoading ? (
                  <LoaderCircle className="size-3 animate-spin" />
                ) : currentSpace ? (
                  getSpaceInitials(currentSpace.name)
                ) : (
                  <SpaceIcon className="size-3" />
                )}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm truncate flex-1 text-left">
              {isLoading
                ? "Loading workspace..."
                : currentSpace?.name || "Select workspace"}
            </span>
            <ChevronDown className="size-4 opacity-70 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[280px]" align="start">
          <Command
            className="rounded-lg relative shadow-md"
            value={currentId || ""}
            onClick={(e) => e.stopPropagation()}
          >
            <CommandInput placeholder="Search spaces..." />
            <CommandList className="p-2">
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <LoaderCircle className="size-4 animate-spin" />
                  </div>
                ) : (
                  "No spaces found."
                )}
              </CommandEmpty>
              {spaces.map((space) => {
                const isCurrent = space.id === currentId;

                return (
                  <CommandItem
                    key={space.id}
                    className="cursor-pointer"
                    onSelect={() => {
                      if (space.id !== currentId) {
                        setCurrent(space.id);
                      }
                      setOpen(false);
                    }}
                    value={space.name}
                  >
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "font-semibold text-xs",
                          space.status === "archived"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {getSpaceInitials(space.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="pr-2">{space.name}</span>
                    {space.status === "archived" && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Archived
                      </span>
                    )}
                    {isCurrent && <Check className="size-3 ml-auto" />}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Loading Modal */}
      <Dialog open={isSwitching} onOpenChange={() => {}}>
        <DialogContent hideClose className="max-w-sm shadow-2xl">
          <DialogTitle className="sr-only">Switching Space</DialogTitle>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <LoaderCircle className="size-6 animate-spin text-muted-foreground opacity-70" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Switching space...</h3>
              <p className="text-muted-foreground">
                Loading `{switchingToSpace}`...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SpaceSelector;
