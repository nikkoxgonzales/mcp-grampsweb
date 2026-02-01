/**
 * Structured response formatting for LLM consumption
 */

export interface ToolResponseOptions {
  status: "success" | "empty" | "error";
  summary: string;
  data?: Record<string, unknown>;
  details?: string;
}

/**
 * Format a tool response with consistent structure for LLM parsing.
 *
 * Output format:
 * **Status:** success|empty|error
 * **Summary:** Brief description of what happened
 *
 * **Data:**
 * ```json
 * { ... structured data ... }
 * ```
 *
 * **Details:**
 * Additional context or next steps
 */
export function formatToolResponse(opts: ToolResponseOptions): string {
  const lines = [
    `**Status:** ${opts.status}`,
    `**Summary:** ${opts.summary}`,
  ];

  if (opts.data && Object.keys(opts.data).length > 0) {
    lines.push("", "**Data:**", "```json", JSON.stringify(opts.data, null, 2), "```");
  }

  if (opts.details) {
    lines.push("", "**Details:**", opts.details);
  }

  return lines.join("\n");
}

/**
 * Format a list of entities for LLM consumption
 */
export function formatEntityList(
  entityType: string,
  entities: Array<Record<string, unknown>>,
  totalCount?: number
): string {
  if (entities.length === 0) {
    return formatToolResponse({
      status: "empty",
      summary: `No ${entityType} found`,
      details: "Try broadening your search query or checking for typos.",
    });
  }

  const data: Record<string, unknown> = {
    count: entities.length,
    results: entities,
  };

  if (totalCount !== undefined && totalCount > entities.length) {
    data.total_count = totalCount;
    data.has_more = true;
  }

  return formatToolResponse({
    status: "success",
    summary: `Found ${entities.length} ${entityType}${entities.length !== 1 ? "s" : ""}`,
    data,
    details: totalCount && totalCount > entities.length
      ? `Showing ${entities.length} of ${totalCount} results. Use page/pagesize params for more.`
      : undefined,
  });
}

/**
 * Format a created entity response with actionable next steps
 */
export function formatCreatedEntity(
  entityType: string,
  displayName: string,
  entityData: Record<string, unknown>,
  nextSteps?: string
): string {
  return formatToolResponse({
    status: "success",
    summary: `Created ${entityType}: ${displayName}`,
    data: entityData,
    details: nextSteps,
  });
}
