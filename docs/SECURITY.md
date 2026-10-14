# Security

Plugins run with the full privileges of the user who installs them. Plugins are not signed, and hooks and scripts run without further prompts. The rules below keep that risk visible and reviewable.

## Reporting a vulnerability

Do not open a public issue. Report it privately through GitHub: **Security → Report a vulnerability** on this repository. Include the plugin name, the version, and steps to reproduce.

If a released version is unsafe, follow the rollback steps in [RELEASES.md](RELEASES.md).

## Secrets

- Never commit tokens, keys or credentials, including in `.mcp.json`, hooks, scripts or examples.
- Ask for secrets through `userConfig` with `"sensitive": true`. The value is kept in secure storage and passed to MCP servers and hooks through `${user_config.KEY}` or `CLAUDE_PLUGIN_OPTION_<KEY>`:

  ```json
  "userConfig": {
    "api_token": { "type": "string", "title": "API token", "description": "Token for the X API", "sensitive": true }
  }
  ```

- `${user_config.KEY}` is not allowed in shell-form hook commands. Read the `CLAUDE_PLUGIN_OPTION_<KEY>` environment variable inside the script instead.
- `claude plugin install` from a shell does not prompt for `userConfig`. Document the `--config` flag in the plugin's README.

## Permissions

- Hooks and MCP servers do only what the plugin's README says they do.
- No network calls from hooks unless the README states which hosts and why.
- No writing outside `${CLAUDE_PLUGIN_DATA}`, the project directory, or a path the user configured.
- Hooks stay fast and quiet. Hooks on `PreToolUse`/`PostToolUse` run on every tool call.
- No `curl … | sh`, no downloading and running code at runtime, no install scripts.

## Reviewing scripts

Every PR that adds or changes code that runs (`hooks/`, `scripts/`, `.mcp.json`, `bin/`, monitors) needs a reviewer to check:

- [ ] what the script executes, and with which inputs (tool input from Claude is untrusted)
- [ ] variables are quoted and inputs are not passed to `eval` or built into shell strings
- [ ] network access and file writes match the README
- [ ] dependencies are pinned (lockfile), with no lifecycle scripts
- [ ] external sources in `marketplace.json` are pinned to a full commit `sha`, and that commit was read
