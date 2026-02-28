# Multi-Agent Example

A multi-agent stock research pipeline that uses the Claude Agent SDK with the Wayfound supervisor plugin. An orchestrator (Claude Sonnet) coordinates two specialist subagents (Claude Haiku) in parallel, then synthesizes their findings into a comprehensive investment report.

## Architecture

```
Orchestrator (Sonnet)
├── news-researcher (Haiku) — searches for recent news and developments
└── ratings-researcher (Haiku) — searches for analyst ratings and price targets
```

Both subagents run in parallel. Once they return, the orchestrator merges the results and writes the final report.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Wayfound credentials
```

## Usage

```bash
npm start -- <TICKER>
```

For example:

```bash
npm start -- AAPL
```

The pipeline typically completes in 2-3 minutes and saves the report to `./<TICKER>_research_report.md`.

## How It Works

1. The orchestrator dispatches `news-researcher` and `ratings-researcher` via the `Task` tool
2. Each subagent performs up to 3 web searches and returns bullet-point findings
3. The orchestrator synthesizes everything into a structured Markdown report and saves it with `Bash`
4. The Wayfound plugin (`../../`) automatically sends session transcripts for analysis

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `WAYFOUND_API_KEY` | Yes | Your Wayfound API key |
| `WAYFOUND_AGENT_ID` | Yes | Wayfound agent ID for the orchestrator |
| `WAYFOUND_AGENT_ID_NEWS_RESEARCHER` | No | Route news-researcher to its own Wayfound supervisor |
| `WAYFOUND_AGENT_ID_RATINGS_RESEARCHER` | No | Route ratings-researcher to its own Wayfound supervisor |
| `WAYFOUND_APPLICATION_ID` | No | Link all agent sessions in a unified Wayfound Application trace |

See [`.env.example`](./.env.example) for details on per-subagent routing and application tracing.
