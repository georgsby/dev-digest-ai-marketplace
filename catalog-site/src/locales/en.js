// All user-facing text of the catalog site. Components and the view-model reference these keys
// through tr()/trp() (src/i18n.js); no UI strings are hard-coded elsewhere.
// Placeholders use {name}. Plurals use <key>.one / <key>.other.

export default {
  // ---- layout ----
  "layout.logo_mark": "d",
  "layout.brand": "dev-digest-ai",
  "layout.catalog": "/ catalog",
  "layout.github": "GitHub",
  "layout.toggle_theme": "Toggle theme",

  // ---- home ----
  "home.find_plugins_skills_and_agents": "Find plugins, skills and agents for Claude Code",
  "home.search_the_catalog": "Search the catalog",
  "home.describe_what_you_need_in": "Describe what you need in plain English",
  "home.smart_search": "Smart search",
  "home.the_catalog_is_empty": "The catalog is empty",
  "home.read_contributing_md": "Read CONTRIBUTING.md",
  "home.recently_updated": "Recently updated",
  "home.all_releases": "All releases",
  "home.version_prefix": "v",
  "home.type": "Type",
  "home.category": "Category",
  "home.tags": "Tags",
  "home.plugin": "Plugin",
  "home.all_plugins": "All plugins",
  "home.runs_no_code": "Runs no code",
  "home.hide_hooks_mcp_servers_scripts": "Hide hooks, MCP servers, scripts",
  "home.clear_filters": "Clear filters",
  "home.sort": "Sort",
  "home.relevance": "Relevance",
  "home.name": "Name",
  "home.turn_on_smart_search": "Turn on smart search",
  "home.nothing_matched": "Nothing matched “",
  "home.remove_filters": "Remove filters",
  "home.try_smart_search": "Try smart search",
  "home.suggest_a_skill": "Suggest a skill",
  "home.smart_match": "· smart match",
  "home.runs_code": "Runs code",
  "home.external": "External",

  // ---- plugin ----
  "plugin.back_to_results": "← Back to results",
  "plugin.plugin": "Plugin ·",
  "plugin.by": "by",
  "plugin.updated": "updated",
  "plugin.external_contents_not_indexed": "External · contents not indexed",
  "plugin.components": "Components",
  "plugin.copy_invocation": "Copy invocation",
  "plugin.configuration": "Configuration",
  "plugin.secret": "secret",
  "plugin.dependencies": "Dependencies",
  "plugin.readme": "README",
  "plugin.releases": "Releases",
  "plugin.atom_feed": "Atom feed",
  "plugin.what_it_runs": "What it runs",
  "plugin.security_md": "SECURITY.md",
  "plugin.view_on_github": "View on GitHub",
  "plugin.report_an_issue": "Report an issue",

  // ---- changelog ----
  "changelog.changelog": "Changelog",
  "changelog.every_release_newest_first_dates": "Every release, newest first. Dates are git tag dates.",
  "changelog.filter_by_plugin": "Filter by plugin",
  "changelog.feed_xml": "feed.xml",

  // ---- bundle ----
  "bundle.bundle": "Bundle",
  "bundle.no_plugins_yet_use": "No plugins yet. Use",
  "bundle.add_to_bundle": "Add to bundle",
  "bundle.on_any_plugin_card": "on any plugin card.",
  "bundle.browse_plugins": "Browse plugins",
  "bundle.added_because": "added because",
  "bundle.needs_it": "needs it",
  "bundle.remove": "Remove",
  "bundle.merge_this_into_your_existing": "Merge this into your existing",
  "bundle.claude_settings_json": ".claude/settings.json",
  "bundle.rather_than_replacing_it": "rather than replacing it.",
  "bundle.copy": "Copy",
  "bundle.in_bundle": "In bundle",
  "bundle.tab_slash": "Slash commands",
  "bundle.summary": "What it runs: {hooks}, {mcp}, {scripts}.{secrets}",
  "bundle.add_label": "+ Bundle",
  "bundle.tab_shell": "Shell script",
  "bundle.tab_settings": "settings.json",
  "bundle.secrets": " Secrets needed: {list}.",
  "bundle.summary_none": "What it runs: no hooks, MCP servers or scripts. This bundle runs no code.",

  // ---- notFound ----
  "notFound.this_page_doesn_t_exist": "This page doesn't exist",

  // ---- footer ----
  "footer.built": "Built",
  "footer.from": "from",
  "footer.catalog_json": "catalog.json",
  "footer.contributing": "Contributing",
  "footer.utc_suffix": " UTC",

  // ---- type ----
  "type.plugin": "Plugin",
  "type.skill": "Skill",
  "type.agent": "Agent",
  "type.command": "Command",
  "type.hook": "Hook",
  "type.mcp": "MCP server",

  // ---- date ----
  "date.format": "{month} {day}, {year}",
  "date.months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],

  // ---- toast ----
  "toast.copied": "Copied",
  "toast.smart_ready": "Smart search ready",
  "toast.copied_install_for": "Copied install command for {plugin}",
  "toast.copied_value": "Copied {value}",
  "toast.copied_install": "Copied install command",

  // ---- theme ----
  "theme.light": "Light",
  "theme.dark": "Dark",

  // ---- nav ----
  "nav.browse": "Browse",
  "nav.changelog": "Changelog",
  "nav.bundle": "Bundle",

  // ---- search ----
  "search.no_intent_match": "No {type}s matched, showing all types.",
  "search.components": "{n} components",
  "search.results.one": "{n} result for “{query}”",
  "search.results.other": "{n} results for “{query}”",

  // ---- filter ----
  "filter.runs_no_code": "Runs no code",

  // ---- hero ----
  "hero.sub_empty": "Search the dev-digest-ai marketplace.",
  "hero.sub": "{components} components across {plugins} plugins in the dev-digest-ai marketplace.",

  // ---- card ----
  "card.version": "v{version}",
  "card.version_of_plugin": "Version of the {plugin} plugin",
  "card.external_not_indexed": "external · not indexed",

  // ---- action ----
  "action.copied": "Copied",
  "action.copy": "Copy",
  "action.copy_install": "Copy install",

  // ---- group ----
  "group.skills": "Skills",
  "group.agents": "Agents",
  "group.commands": "Commands",
  "group.hooks": "Hooks",
  "group.mcp": "MCP servers",

  // ---- meta ----
  "meta.allowed_tools": "allowed-tools: {value}",
  "meta.tools": "tools: {value}",
  "meta.argument_hint": "argument-hint: {value}",
  "meta.model": "model: {value}",

  // ---- surface ----
  "surface.none_declared": "None declared",
  "surface.scripts": "Scripts",
  "surface.skill_tool_access": "Skill tool access",
  "surface.configuration": "Configuration",
  "surface.secret_suffix": "  (secret)",
  "surface.dependencies": "Dependencies",
  "surface.runs_code": "Runs code on your machine",
  "surface.runs_no_code": "Runs no code",

  // ---- install ----
  "install.one_step": "One step",
  "install.requires_version": "Requires Claude Code 2.1.275 or later.",
  "install.two_steps": "Two steps",
  "install.shell": "Shell",
  "install.needs_config": "This plugin needs configuration. Pass each key with --config, or Claude Code will prompt for it.",

  // ---- count ----
  "count.hook.one": "{n} hook",
  "count.hook.other": "{n} hooks",
  "count.mcp.one": "{n} MCP server",
  "count.mcp.other": "{n} MCP servers",
  "count.script.one": "{n} script",
  "count.script.other": "{n} scripts",

  // ---- search vocabulary (language specific) ----
  search: {
    "INTENT": {
      "skill": "skill",
      "skills": "skill",
      "agent": "agent",
      "agents": "agent",
      "subagent": "agent",
      "subagents": "agent",
      "hook": "hook",
      "hooks": "hook",
      "command": "command",
      "commands": "command",
      "mcp": "mcp",
      "server": "mcp",
      "servers": "mcp",
      "plugin": "plugin",
      "plugins": "plugin"
    },
    "STOP_PH": [
      "i need",
      "i want",
      "looking for",
      "something that",
      "help me",
      "is there",
      "can you",
      "find me",
      "show me"
    ],
    "stop": [
      "a",
      "an",
      "the",
      "for",
      "to",
      "that",
      "which",
      "with",
      "of",
      "and",
      "my",
      "me",
      "i",
      "some",
      "any",
      "in",
      "on",
      "is",
      "it",
      "can",
      "do",
      "does",
      "will",
      "up",
      "something"
    ],
    "SYN": {
      "pr": [
        "pull request",
        "merge request"
      ],
      "commit": [
        "commit message"
      ],
      "commits": [
        "commit"
      ],
      "test": [
        "tests"
      ],
      "tests": [
        "test"
      ],
      "docs": [
        "documentation",
        "readme"
      ],
      "doc": [
        "documentation"
      ],
      "db": [
        "database",
        "postgres",
        "sql"
      ],
      "database": [
        "postgres",
        "sql"
      ],
      "ticket": [
        "issue",
        "issues"
      ],
      "tickets": [
        "issues"
      ],
      "changelog": [
        "release notes"
      ],
      "review": [
        "reviewer"
      ]
    },
    "CONCEPTS": {
      "tidy": [
        "rebase",
        "history",
        "squash"
      ],
      "clean": [
        "rebase",
        "history"
      ],
      "cleanup": [
        "rebase",
        "history"
      ],
      "history": [
        "rebase",
        "commit"
      ],
      "squash": [
        "rebase"
      ],
      "slow": [
        "plan",
        "index",
        "explain"
      ],
      "query": [
        "sql",
        "explain"
      ],
      "ship": [
        "release",
        "changelog"
      ],
      "publish": [
        "release"
      ],
      "version": [
        "release",
        "semver"
      ],
      "bump": [
        "semver",
        "release"
      ],
      "document": [
        "readme",
        "docs"
      ],
      "describe": [
        "readme",
        "docs"
      ],
      "verify": [
        "tests"
      ],
      "broken": [
        "tests",
        "fix"
      ],
      "failing": [
        "tests",
        "fix"
      ],
      "bugs": [
        "review",
        "tests"
      ],
      "feedback": [
        "review"
      ],
      "backlog": [
        "triage",
        "issues"
      ],
      "organize": [
        "triage"
      ],
      "secrets": [
        "security",
        "sensitive"
      ],
      "discover": [
        "find",
        "search"
      ],
      "recommend": [
        "find",
        "search"
      ]
    }
  },
};
