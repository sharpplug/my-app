"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-provider";
import { subscribeToNotifications, markNotificationRead, type AppNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

function formatTime(n: AppNotification) {
  const date = n.createdAt?.toDate();
  if (!date) return "Just now";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && user) {
      notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(user.uid, n.id).catch(() => {}));
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="p-3 border-b font-bold text-sm">Notifications</div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">Nothing yet - activity across your wallet, gifts, and sales shows up here.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={cn("p-3 border-b last:border-b-0 text-left", !n.read && "bg-primary/5")}>
                <p className="text-sm font-bold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTime(n)}</p>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
