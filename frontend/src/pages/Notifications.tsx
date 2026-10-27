import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { notifications } from "../api/endpoints";
import type { AppNotification } from "../api/types";
import { Page } from "../components/Layout";
import { Button, EmptyState, ErrorState, PageHeader, Pager, SkeletonRows } from "../components/ui";
import { relativeTime } from "../lib/format";
import { messageFor } from "../lib/messages";

const PAGE = 20;

function Icon({ kind }: { kind: string }) {
  const blocked = kind === "content_blocked" || kind === "question_duplicate";
  return (
    <span className={`note-icon ${blocked ? "note-icon-warn" : "note-icon-ok"}`} aria-hidden="true">
      {blocked ? "!" : "✓"}
    </span>
  );
}

export default function Notifications() {
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["notifications", "list", offset],
    queryFn: () => notifications.list({ limit: PAGE, offset }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readOne = useMutation({ mutationFn: notifications.markRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: notifications.markAllRead, onSuccess: refresh });

  const open = (n: AppNotification) => {
    if (!n.is_read) readOne.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Page>
      <PageHeader
        title="Notifications"
        intro="Replies to your doubts, and notices when a post was blocked for inappropriate language."
        actions={
          query.data && query.data.unread > 0 ? (
            <Button variant="secondary" loading={readAll.isPending} onClick={() => readAll.mutate()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {query.isPending ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState message={messageFor(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="You are all caught up">
          New answers to your doubts and moderation notices will show up here.
        </EmptyState>
      ) : (
        <>
          <ul className="notes">
            {query.data.items.map((n) => (
              <li key={n.id} className={`note ${n.is_read ? "" : "note-unread"} note-${n.kind}`}>
                <Icon kind={n.kind} />
                <div className="note-body">
                  <p className="note-title">{n.title}</p>
                  <p className="note-text">{n.message}</p>
                  <p className="note-meta">{relativeTime(n.created_at)}</p>
                </div>
                <div className="note-actions">
                  {n.link && (
                    <Button variant="secondary" onClick={() => open(n)}>
                      View
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button variant="quiet" onClick={() => readOne.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager total={query.data.total} limit={query.data.limit || PAGE} offset={query.data.offset} onChange={setOffset} />
        </>
      )}
    </Page>
  );
}
