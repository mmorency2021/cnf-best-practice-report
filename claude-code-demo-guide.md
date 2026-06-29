# Claude Code — Demo Guide

> A practical walkthrough of Claude Code's core capabilities for developers and teams.

---

## 1. How Coding Assistants Work

A coding assistant is more than just a tool that writes code — it's a sophisticated system that uses language models to tackle complex programming tasks. When you give a coding assistant a task (e.g., fixing a bug from an error message), it follows the same process a human developer would:

1. **Gather context** — Understand the error, identify the affected code, and locate relevant files
2. **Formulate a plan** — Decide on an approach: change code, run tests, verify the fix
3. **Take action** — Implement the solution by updating files and running commands

The first and last steps require the assistant to **interact with the outside world** — reading files, fetching documentation, running commands, or editing code.

### The Tool Use Model

Language models by themselves can only process and return text — they cannot read files or run commands directly. Coding assistants solve this through a system called **tool use**:

1. You ask: *"What code is written in main.go?"*
2. The assistant adds tool instructions to your request
3. The model responds: `ReadFile: main.go`
4. The assistant reads the actual file and sends its contents back to the model
5. The model provides a final answer based on the file contents

This allows language models to effectively "read files," "write code," and "run commands" through carefully formatted text responses.

### Why Claude Excels at Tool Use

The Claude model family (Opus, Sonnet, Haiku) is particularly strong at understanding what tools do and using them effectively. This provides several key advantages:

| Benefit | Description |
|---------|-------------|
| **Tackles harder tasks** | Combines different tools to handle complex work; adapts to unfamiliar tools |
| **Extensible platform** | Easily add new tools; Claude adapts as your workflow evolves |
| **Better security** | Navigates codebases without indexing — no need to send your entire codebase to external servers |

---

## 2. Installation & Setup

Full setup instructions: [claude.ai/code — Quickstart](https://code.claude.com/docs/en/quickstart)

### Install Claude Code

| Platform | Command |
|----------|---------|
| macOS / Linux / WSL | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Windows PowerShell | `irm https://claude.ai/install.ps1 \| iex` |
| Windows CMD | `curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd` |
| macOS (Homebrew) | `brew install --cask claude-code` |

After installation, run `claude` in your terminal. On first launch, you'll pick a color theme and authenticate with your claude.ai credentials.

> **Tip:** Using Amazon Bedrock, Google Cloud Vertex AI, or Microsoft Foundry? See the [third-party provider setup](https://code.claude.com/docs/en/quickstart) docs.

---

## 3. Adding Context

Context management is crucial. Your project may have hundreds of files, but Claude only needs the *right* information. Too much irrelevant context actually decreases performance.

### The `/init` Command

Run `/init` when you first open a project. Claude analyzes your codebase and creates a **CLAUDE.md** file summarizing:

- Project purpose and architecture
- Important commands and critical files
- Coding patterns and structure

### The CLAUDE.md File

This file serves two purposes:

1. **Guides Claude** through your codebase — architecture, commands, coding style
2. **Custom directives** — your specific instructions to Claude

It's included in every request, acting as a persistent system prompt for your project.

### CLAUDE.md Locations

| File | Scope | Shared? |
|------|-------|---------|
| `CLAUDE.md` | Project-level (generated with `/init`) | Yes — committed to source control |
| `CLAUDE.local.md` | Personal overrides | No — gitignored |
| `~/.claude/CLAUDE.md` | Global — applies to all projects | No — local to your machine |

### Adding Custom Instructions

Edit `CLAUDE.md` directly in your editor, or run `/memory` inside Claude Code.

**Example:** If Claude is adding too many comments, add:

```
Use comments sparingly. Only comment complex code.
```

### File Mentions with `@`

Use `@` followed by a file path to include that file's contents in your request:

```
How does the auth system work? @auth
```

Claude shows a list of matching files to choose from and includes the selected file in the conversation.

You can also reference files in your CLAUDE.md:

```
The database schema is defined in @prisma/schema.prisma.
Reference it anytime you need to understand the data structure.
```

> **Tip:** If your repo has an `AGENTS.md` for another tool, add `@AGENTS.md` on the first line of CLAUDE.md — no need to duplicate instructions.

---

## 4. Making Changes

### Using Screenshots

Paste screenshots into Claude with **Ctrl+V** (not Cmd+V on macOS) for precise visual communication. This helps Claude understand exactly which part of the interface you want to modify.

### Planning Mode

For complex tasks requiring broad codebase exploration, enable **Planning Mode**:

- Type `/plan`, or press **Shift+Tab** twice (once if already auto-accepting edits)
- Claude reads more files, creates a detailed implementation plan, and waits for your approval

> **Tip:** Press **Ctrl+G** to open the plan in your text editor for precise edits before approving.

### Effort Level

Control how deeply Claude reasons through a problem:

| Command | Effect |
|---------|--------|
| `/effort low` | Faster, cheaper responses |
| `/effort high` | Deeper reasoning on hard problems |
| `/effort max` | Maximum reasoning depth |
| `ultrathink` keyword | Extra thinking on a single prompt (doesn't change session level) |

Press **Ctrl+O** to expand Claude's reasoning steps in real time.

### When to Use What

| Scenario | Use |
|----------|-----|
| Broad codebase understanding, multi-file changes | **Planning Mode** |
| Complex logic, debugging, algorithmic challenges | **Higher Effort Level** |
| Both breadth and depth needed | **Combine both** |

---

## 5. Controlling Context

### Interrupting with Escape

Press **Escape** to stop Claude mid-response and redirect. Useful when Claude tackles too much at once.

### Combining Escape with Memories

When Claude makes the same mistake repeatedly:

1. Press **Escape** to stop
2. Run `/memory` (or edit CLAUDE.md) to add a correction
3. Continue — the fix persists across future conversations

### Rewinding Conversations

Press **Escape twice** or type `/rewind` to jump back to an earlier message. This preserves valuable context while removing distracting conversation history.

### Context Management Commands

| Command | When to Use |
|---------|-------------|
| `/compact` | Conversation is long but contains important context — summarizes while preserving key knowledge |
| `/clear` | Switching to an unrelated task — starts fresh (use `/resume` to return later) |

---

## 6. Custom Commands

Create project-specific commands by adding markdown files to `.claude/commands/`.

### Creating a Command

```
.claude/
  commands/
    audit.md        →  creates /audit
    write_tests.md  →  creates /write_tests
```

### Example: Audit Command (`audit.md`)

```markdown
Run the following steps:
1. Run `npm audit` to find vulnerable packages
2. Run `npm audit fix` to apply updates
3. Run tests to verify nothing broke
```

### Commands with Arguments

Use `$ARGUMENTS` as a placeholder:

**`write_tests.md`:**
```markdown
Write comprehensive tests for: $ARGUMENTS

Testing conventions:
- Use Vitest with React Testing Library
- Place test files in __tests__/ alongside source
- Name files [filename].test.ts(x)
- Cover happy paths, edge cases, and error states
```

**Usage:**
```
/write_tests the use-auth.ts file in the hooks directory
```

### Key Benefits

- **Automation** — Repetitive workflows become single commands
- **Consistency** — Same steps followed every time
- **Context** — Project-specific instructions baked in
- **Flexibility** — Arguments make commands reusable

---

## 7. MCP Servers

Extend Claude Code's capabilities by adding **MCP (Model Context Protocol) servers**. These run locally or remotely and give Claude new tools.

### Example: Playwright (Browser Control)

**Install:**
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

**Pre-approve permissions** in `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": ["mcp__playwright"],
    "deny": []
  }
}
```

> Note the double underscores in `mcp__playwright`.

### Practical Workflow

With Playwright, Claude can:

1. Open a browser and navigate to your app
2. Generate a component
3. Analyze the visual output
4. Update generation prompts based on what it *sees*
5. Test the improved prompt

The key advantage: Claude sees the **actual visual output**, not just code, enabling much more informed styling and layout decisions.

### Other MCP Servers

- Database interactions
- API testing and monitoring
- Cloud service integrations
- Development tool automation

---

## 8. GitHub Integration

Claude Code has an official GitHub integration that runs inside GitHub Actions.

### Setup

Run `/install-github-app` in Claude to:

1. Install the Claude Code app on GitHub
2. Add your API key
3. Generate a PR with the workflow files

### Default Workflows

| Workflow | Trigger | What Claude Does |
|----------|---------|------------------|
| **Mention** | `@claude` in any issue or PR | Analyzes request, creates a plan, executes with full repo access, responds in-thread |
| **PR Review** | New pull request created | Reviews changes, analyzes impact, posts a detailed report |

### Customizing Workflows

After merging the initial PR, customize the workflow files:

**Add project setup steps:**
```yaml
- name: Project Setup
  run: |
    npm run setup
    npm run dev:daemon
```

**Provide custom instructions:**
```yaml
custom_instructions: |
  The project is already set up with all dependencies installed.
  The server is running at localhost:3000.
  Use mcp__playwright tools to launch a browser if needed.
```

**Configure MCP servers:**
```yaml
mcp_config: |
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest", "--allowed-origins", "localhost:3000"]
      }
    }
  }
```

**Specify tool permissions:**
```yaml
allowed_tools: "Bash(npm:*),Bash(sqlite3:*),mcp__playwright__browser_snapshot,..."
```

> **Important:** In GitHub Actions, each tool must be individually listed — no shortcuts.

---

## 9. Hooks

Hooks let you run commands **before or after** Claude uses a tool. They enable automated workflows like formatting code after edits, running tests on file changes, or blocking access to specific files.

### How Hooks Work

Hooks insert into the normal tool execution flow:

```
You → Claude Model → Tool Use Decision
                        ↓
                  PreToolUse Hook  ← runs before tool execution
                        ↓
                  Tool Execution
                        ↓
                  PostToolUse Hook ← runs after tool execution
                        ↓
                  Result → Claude
```

### Hook Types

| Hook | When It Runs | Use Case |
|------|-------------|----------|
| **PreToolUse** | Before a tool is called | Validate, block, or modify the operation |
| **PostToolUse** | After a tool is called | Format code, run tests, trigger builds |

---

## Quick Reference — Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+V** | Paste screenshot |
| **Ctrl+O** | Show/hide reasoning steps |
| **Ctrl+G** | Open plan in editor |
| **Escape** | Stop Claude mid-response |
| **Escape × 2** | Rewind conversation |
| **Shift+Tab** | Toggle auto-accept edits |
| **Shift+Tab × 2** | Enter Planning Mode |

---

## Quick Reference — Commands

| Command | Purpose |
|---------|---------|
| `/init` | Generate CLAUDE.md for your project |
| `/memory` | Edit CLAUDE.md instructions |
| `/plan` | Enter Planning Mode |
| `/effort` | View/set reasoning effort level |
| `/compact` | Summarize conversation, keep context |
| `/clear` | Fresh start (use `/resume` to return) |
| `/rewind` | Jump back to an earlier message |
| `/install-github-app` | Set up GitHub integration |

---

*Built with Claude Code — [code.claude.com](https://code.claude.com)*
