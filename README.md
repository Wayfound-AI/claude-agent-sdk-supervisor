# Wayfound Claude Agent SDK Supervisor

A plugin for the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) that sends session events to [Wayfound](https://app.wayfound.ai) for analysis and supervision.

## Installation

Clone this repo and point to it from your agent's `query()` call:

```bash
git clone https://github.com/Wayfound-AI/claude-agent-sdk-supervisor.git
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "your prompt",
  options: {
    plugins: [{ type: "local", path: "./path/to/claude-agent-sdk-supervisor" }],
    // ... other options
  },
})) {
  // handle messages
}
```

The plugin hooks fire automatically. No other code changes are needed.

## Configuration

Set two environment variables:

| Variable            | Required | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `WAYFOUND_API_KEY`  | Yes      | Your Wayfound API key (used as Bearer token) |
| `WAYFOUND_AGENT_ID` | Yes      | Wayfound agent ID to associate sessions with |

You can set these in a `.env` file at your project root or export them directly.

## How It Works

The plugin reads the SDK's transcript at session end to reconstruct the full conversation:

1. **SessionStart** — Logs that the session began (debug only)
2. **SessionEnd** — Reads the transcript JSONL file, transforms each entry into a Wayfound event (`user_message`, `assistant_message`, `tool_call`), bookends with `system_message` events, and sends a single POST to Wayfound

The transcript contains every user prompt, assistant response, tool invocation, and tool result. No intermediate buffering or per-event hooks are needed.

## Requirements

- `jq` must be installed and available on PATH
- `curl` must be installed and available on PATH

## Graceful Degradation

If `WAYFOUND_API_KEY` or `WAYFOUND_AGENT_ID` are not set, all hooks exit silently with no errors and no API calls. This lets you include the plugin in your project without requiring Wayfound credentials for local development.

## Examples

See the [`examples/`](./examples/) directory for working examples:

- **[single-agent](./examples/single-agent/)** — Stock research CLI that uses the Wayfound plugin with the Claude Agent SDK
- **[multi-agent](./examples/multi-agent/)** — Multi-agent stock research using subagents (news researcher + ratings researcher) coordinated by an orchestrator
