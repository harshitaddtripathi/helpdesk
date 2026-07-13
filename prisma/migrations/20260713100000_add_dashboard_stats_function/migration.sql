CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total INTEGER,
  open_tickets INTEGER,
  resolved_tickets INTEGER,
  closed_tickets INTEGER,
  ai_resolved INTEGER,
  ai_resolved_percent DOUBLE PRECISION,
  average_resolution_time_seconds INTEGER,
  tickets_by_day JSONB,
  counts_by_category JSONB
)
LANGUAGE sql
STABLE
AS $$
WITH ticket_counts AS (
  SELECT
    COUNT(*)::INTEGER AS total,
    COUNT(*) FILTER (WHERE "status" = 'open'::"TicketStatus")::INTEGER AS open_tickets,
    COUNT(*) FILTER (WHERE "status" = 'resolved'::"TicketStatus")::INTEGER AS resolved_tickets,
    COUNT(*) FILTER (WHERE "status" = 'closed'::"TicketStatus")::INTEGER AS closed_tickets
  FROM "Ticket"
),
ai_resolved_counts AS (
  SELECT COUNT(*)::INTEGER AS ai_resolved
  FROM "Ticket" ticket
  WHERE EXISTS (
    SELECT 1
    FROM "AiOutput" output
    WHERE output."ticketId" = ticket."id"
      AND output."type" = 'SUGGESTED_REPLY'::"AiOutputType"
      AND output."metadata"->>'source' = 'auto-resolution'
  )
),
average_resolution AS (
  SELECT ROUND(
    AVG(EXTRACT(EPOCH FROM GREATEST("updatedAt" - "createdAt", INTERVAL '0 seconds')))
  )::INTEGER AS average_resolution_time_seconds
  FROM "Ticket"
  WHERE "status" = 'resolved'::"TicketStatus"
),
days AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '29 days')::DATE,
    CURRENT_DATE::DATE,
    INTERVAL '1 day'
  )::DATE AS day
),
daily_counts AS (
  SELECT
    days.day,
    COUNT(ticket."id")::INTEGER AS ticket_count
  FROM days
  LEFT JOIN "Ticket" ticket
    ON ticket."createdAt" >= days.day::TIMESTAMP
   AND ticket."createdAt" < (days.day + 1)::TIMESTAMP
  GROUP BY days.day
),
category_counts AS (
  SELECT
    ticket."categoryId",
    COUNT(*)::INTEGER AS ticket_count
  FROM "Ticket" ticket
  GROUP BY ticket."categoryId"
)
SELECT
  ticket_counts.total,
  ticket_counts.open_tickets,
  ticket_counts.resolved_tickets,
  ticket_counts.closed_tickets,
  ai_resolved_counts.ai_resolved,
  CASE
    WHEN ticket_counts.total > 0
      THEN FLOOR((ai_resolved_counts.ai_resolved::DOUBLE PRECISION / ticket_counts.total) * 1000 + 0.5) / 10
    ELSE 0
  END AS ai_resolved_percent,
  average_resolution.average_resolution_time_seconds,
  (
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'date', TO_CHAR(daily_counts.day, 'YYYY-MM-DD'),
          'label', TO_CHAR(daily_counts.day, 'Mon FMDD'),
          'count', daily_counts.ticket_count
        )
        ORDER BY daily_counts.day
      ),
      '[]'::JSONB
    )
    FROM daily_counts
  ) AS tickets_by_day,
  (
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'categoryId', category_counts."categoryId",
          'name', COALESCE(category."name", 'Uncategorized'),
          'slug', COALESCE(category."slug", 'uncategorized'),
          'count', category_counts.ticket_count
        )
        ORDER BY COALESCE(category."name", 'Uncategorized')
      ),
      '[]'::JSONB
    )
    FROM category_counts
    LEFT JOIN "Category" category ON category."id" = category_counts."categoryId"
  ) AS counts_by_category
FROM ticket_counts
CROSS JOIN ai_resolved_counts
CROSS JOIN average_resolution;
$$;
