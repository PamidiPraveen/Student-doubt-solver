import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { notifications } from "../api/endpoints";

/** Bell with an unread badge. Polls quietly so blocked posts and new answers show up. */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: notifications.unreadCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const count = unread.data ?? 0;

  return (
    <Link
      to="/notifications"
      className="bell"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          d="M12 3a6 6 0 0 0-6 6v3.2c0 .5-.2 1-.5 1.4L4 15.5c-.5.7 0 1.5.8 1.5h14.4c.8 0 1.3-.8.8-1.5l-1.5-1.9a2.3 2.3 0 0 1-.5-1.4V9a6 6 0 0 0-6-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9.8 19.5a2.4 2.4 0 0 0 4.4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="bell-count" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
