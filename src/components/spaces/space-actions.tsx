"use client";

import { useState } from "react";
import { Button } from "ui/button";
import { Archive, ArchiveRestore, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "ui/alert-dialog";
import { toast } from "sonner";

interface SpaceActionsProps {
  spaceId: string;
  spaceName: string;
  status: "active" | "archived" | "deleted";
  canArchive: boolean;
  canUnarchive: boolean;
  retentionDaysRemaining?: number;
}

export function SpaceActions({
  spaceId,
  spaceName,
  status,
  canArchive,
  canUnarchive,
  retentionDaysRemaining,
}: SpaceActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/spaces/${spaceId}/archive`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Workspace archived successfully");
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to archive workspace");
      }
    } catch (_error) {
      toast.error("Failed to archive workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/spaces/${spaceId}/unarchive`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Workspace restored successfully");
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to restore workspace");
      }
    } catch (_error) {
      toast.error("Failed to restore workspace");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "deleted") {
    return (
      <div className="text-sm text-muted-foreground">
        This workspace has been permanently deleted
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {status === "active" && canArchive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Workspace</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive `{spaceName}`?
                <br />
                <br />
                <strong>This will:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Make the workspace read-only</li>
                  <li>Prevent all modifications</li>
                  <li>
                    Schedule it for deletion after{" "}
                    {retentionDaysRemaining || 30} days
                  </li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} disabled={isLoading}>
                Archive Workspace
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {status === "archived" && canUnarchive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Workspace</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to restore `{spaceName}`?
                <br />
                <br />
                This will make the workspace active again and allow
                modifications.
                {retentionDaysRemaining && retentionDaysRemaining > 0 && (
                  <>
                    <br />
                    <br />
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        {retentionDaysRemaining} days remaining before permanent
                        deletion
                      </span>
                    </div>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnarchive} disabled={isLoading}>
                Restore Workspace
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {status === "archived" && !canUnarchive && (
        <div className="text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          Retention period expired - cannot restore
        </div>
      )}
    </div>
  );
}
