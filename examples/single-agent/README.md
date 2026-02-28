# Single-Agent Example

A single-agent stock research CLI that uses the Claude Agent SDK with the Wayfound supervisor plugin. Given a stock ticker, the agent searches the web for analyst ratings, recent news, and market sentiment, then writes a Markdown investment report.

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

The agent will run up to 10 turns using Claude Haiku, perform up to 3 web searches, and save the report to `./<TICKER>_research_report.md`.

## How It Works

1. A single Claude agent receives a system prompt with research instructions
2. The agent uses `WebSearch` to gather financial data and `Bash` to write the report
3. The Wayfound plugin (`../../`) automatically sends the session transcript for analysis

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `WAYFOUND_API_KEY` | Yes | Your Wayfound API key |
| `WAYFOUND_AGENT_ID` | Yes | Wayfound agent ID for this agent's sessions |

See [`.env.example`](./.env.example) for details.
