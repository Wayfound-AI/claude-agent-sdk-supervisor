import "dotenv/config";
import { query, type SDKMessage, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

const ticker = process.argv[2];
if (!ticker) {
  console.error("Usage: npx tsx src/index.ts <TICKER>");
  process.exit(1);
}

const systemPrompt = `You are an investment research analyst. Your job is to research the stock ticker ${ticker} and produce a comprehensive Markdown investment research report.

Follow these steps:

1. Use WebSearch (max 3 searches) to gather: analyst ratings, price targets, recent news, and market sentiment for ${ticker}.
2. Synthesize your findings into a comprehensive report.
3. Use the Bash tool to save the report: bash -c 'cat > ./${ticker}_research_report.md << "REPORT_EOF"\n<report content>\nREPORT_EOF'

The report must include these sections:
- Executive Summary
- Analyst Ratings & Price Targets
- Recent News & Developments
- Sentiment Analysis
- Risk Factors
- Investment Outlook
- Disclaimer

Be concise and efficient. Do not use more than 3 WebSearch calls.`;

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
        if (b.type === "tool_use") return `tool_use(${b.name})`;
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
          if (b.type === "tool_result") return `tool_result(${b.tool_use_id})`;
          if (b.type === "text") return `text(${b.text.slice(0, 60)})`;
          return b.type;
        });
        console.log(`${prefix} ${blocks.join(", ")}`);
      }
      break;
    }
    case "result":
      // Handled separately in main loop
      break;
    default:
      console.log(`${prefix}`);
  }
}

async function main() {
  for await (const message of query({
    prompt: `Research ${ticker} and save a Markdown investment report to the file ./${ticker}_research_report.md in the current working directory.`,
    options: {
      cwd: process.cwd(),
      tools: ["WebSearch", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 10,
      model: "haiku",
      systemPrompt,
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
