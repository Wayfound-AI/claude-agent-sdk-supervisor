import "dotenv/config";
import {
  query,
  type SDKMessage,
  type SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";

const ticker = process.argv[2];
if (!ticker) {
  console.error("Usage: npx tsx src/index.ts <TICKER>");
  process.exit(1);
}

// Orchestrator prompt — coordinates subagents, then writes the final report
const systemPrompt = `You are a lead investment research analyst coordinating a team of specialists to produce a comprehensive research report on ${ticker}.

Your workflow:
1. Dispatch the "news-researcher" agent to find recent news and developments for ${ticker}.
2. Dispatch the "ratings-researcher" agent to find analyst ratings, price targets, and market sentiment for ${ticker}.
3. Once both agents return their findings, synthesize everything into a comprehensive Markdown report.
4. Save the report using Bash: bash -c 'cat > ./${ticker}_research_report.md << "REPORT_EOF"\n<report content>\nREPORT_EOF'

The final report must include:
- Executive Summary
- Analyst Ratings & Price Targets
- Recent News & Developments
- Sentiment Analysis
- Risk Factors
- Investment Outlook
- Disclaimer

Dispatch both researcher agents in parallel for speed.`;

function logMessage(message: SDKMessage) {
  const subtype = "subtype" in message ? `:${message.subtype}` : "";
  const prefix = `[${message.type}${subtype}]`;

  switch (message.type) {
    case "system":
      if (message.subtype === "init") {
        console.log(
          `${prefix} session=${message.session_id} model=${message.model} tools=${message.tools.join(",")}`,
        );
        if (message.plugins?.length) {
          console.log(
            `${prefix} plugins=${message.plugins.map((p) => p.name).join(",")}`,
          );
        }
      } else {
        console.log(`${prefix}`);
      }
      break;
    case "assistant": {
      const blocks = message.message.content.map((b: any) => {
        if (b.type === "text") return `text(${b.text.slice(0, 80)}...)`;
        if (b.type === "tool_use") {
          if (b.name === "Task") {
            return `Task(${b.input?.subagent_type ?? b.input?.name ?? "unknown"})`;
          }
          return `tool_use(${b.name})`;
        }
        return b.type;
      });
      console.log(`${prefix} ${blocks.join(", ")}`);
      break;
    }
    case "user": {
      const content = message.message.content;
      if (typeof content === "string") {
        console.log(`${prefix} ${content.slice(0, 100)}`);
      } else if (Array.isArray(content)) {
        const blocks = content.map((b) => {
          if (b.type === "tool_result")
            return `tool_result(${b.tool_use_id})`;
          if (b.type === "text") return `text(${b.text.slice(0, 60)})`;
          return b.type;
        });
        console.log(`${prefix} ${blocks.join(", ")}`);
      }
      break;
    }
    case "result":
      break;
    default:
      console.log(`${prefix}`);
  }
}

async function main() {
  console.log(`Researching ${ticker} with multi-agent pipeline...\n`);

  for await (const message of query({
    prompt: `Research ${ticker} and save a Markdown investment report to ./${ticker}_research_report.md`,
    options: {
      cwd: process.cwd(),
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 15,
      model: "sonnet",
      systemPrompt,
      // Task tool is required for subagent invocation
      allowedTools: ["Bash", "Task"],
      agents: {
        "news-researcher": {
          description:
            "Researches recent news and developments for a stock ticker. Use this agent to find breaking news, earnings reports, product launches, regulatory actions, and other recent events.",
          prompt: `You are a financial news researcher. Given a stock ticker, search the web for the most recent and relevant news.

Focus on:
- Earnings reports and financial results
- Product launches or strategic announcements
- Regulatory or legal developments
- Management changes
- Market-moving events

Use up to 3 WebSearch calls. Return a concise bullet-point summary of your findings.`,
          tools: ["WebSearch"],
          model: "haiku",
        },
        "ratings-researcher": {
          description:
            "Researches analyst ratings, price targets, and market sentiment for a stock ticker. Use this agent to find Wall Street consensus, buy/sell ratings, and sentiment indicators.",
          prompt: `You are a financial analyst ratings researcher. Given a stock ticker, search the web for current analyst ratings and market sentiment.

Focus on:
- Consensus analyst rating (buy/hold/sell)
- Price targets (low, average, high)
- Recent rating changes or upgrades/downgrades
- Institutional sentiment and fund flows
- Short interest or other sentiment indicators

Use up to 3 WebSearch calls. Return a concise bullet-point summary of your findings.`,
          tools: ["WebSearch"],
          model: "haiku",
        },
      },
      plugins: [{ type: "local", path: "../../" }],
    },
  })) {
    logMessage(message);

    if (message.type === "result") {
      const result = message as SDKResultMessage;
      const durationSec = (result.duration_ms / 1000).toFixed(1);
      console.log("\n========================================");
      console.log(
        result.is_error
          ? `Research FAILED after ${durationSec}s`
          : `Research complete in ${durationSec}s`,
      );
      console.log("========================================");
      if ("result" in result) {
        console.log(result.result);
      }
      if ("errors" in result) {
        console.error("Errors:", (result as any).errors);
      }
      console.log(`Turns: ${result.num_turns}`);
      console.log(`Cost: $${result.total_cost_usd.toFixed(4)}`);
      console.log(
        `Tokens: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`,
      );
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
