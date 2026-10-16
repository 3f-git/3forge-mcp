// Codex-only Markdown projection. Keep the canonical Claude instructions and
// every other target's adaptation independent of these compatibility rewrites.
export function codexMarkdown(content) {
  return content
    .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/", "skills/")
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__")
    .replace(/\bselect:(?=[a-zA-Z0-9_])/g, "")
    .replaceAll("Use ToolSearch to find/load the deferred `3forge-runtime` tool schemas you'll need:",
      "Use the `3forge-runtime` tool schemas already exposed in the current session. If schemas are deferred, load them with the available MCP tool discovery capability:")
    .replaceAll("**Discover tools** with ToolSearch (the `3forge-runtime` tools are deferred).",
      "**Discover tools** using the current session's MCP tool catalog. If schemas are deferred, use the available MCP tool discovery capability.")
    .replaceAll("`ToolSearch`", "tool discovery")
    .replace(/\bToolSearch\b/g, "tool discovery")
    .replaceAll("Call tool discovery", "Use tool discovery")
    .replaceAll("the `3forge-runtime` tools are deferred", "when `3forge-runtime` tool schemas are deferred");
}
