# pi-opencode-config-reader

A [pi](https://github.com/earendil-works/pi-mono) extension that automatically reads your [OpenCode](https://opencode.ai) configuration and registers all custom providers as pi providers.

No need to maintain duplicate provider configs. Set up once in OpenCode, use everywhere.

## What It Does

- Scans multiple config locations (project-level, XDG, home directory)
- Parses JSONC (comments + trailing commas supported)
- Registers every OpenCode provider with pi as an `openai-completions` compatible provider
- Automatically detects reasoning models (via `interleaved` field)
- Automatically detects image-capable models (via `modalities` field)

## Config Search Order

The extension looks for `opencode.json` or `opencode.jsonc` in this order:

| Priority | Path |
|----------|------|
| 1 | `./opencode.json` (project root) |
| 2 | `./opencode.jsonc` (project root) |
| 3 | `$XDG_CONFIG_HOME/opencode/opencode.json` |
| 4 | `$XDG_CONFIG_HOME/opencode/opencode.jsonc` |
| 5 | `~/.config/opencode/opencode.json` |
| 6 | `~/.config/opencode/opencode.jsonc` |
| 7 | `~/.opencode/config.json` (legacy) |

The first file found wins. Project-level config takes precedence over global.

## Installation

### Quick: Copy to extensions directory

```bash
# Global (all projects)
cp opencode-config-reader.ts ~/.pi/agent/extensions/

# Project-local
mkdir -p .pi/extensions
cp opencode-config-reader.ts .pi/extensions/
```

### One-off: CLI flag

```bash
pi --extension /path/to/opencode-config-reader.ts
```

### Via settings.json

Add to `~/.pi/agent/settings.json` or `.pi/settings.json`:

```json
{
  "extensions": ["/path/to/opencode-config-reader.ts"]
}
```

## Example OpenCode Config

If your `~/.config/opencode/opencode.json` looks like this:

```json
{
  "provider": {
    "deepseek": {
      "api": "openai",
      "name": "DeepSeek",
      "options": {
        "apiKey": "sk-xxx",
        "baseURL": "https://api.deepseek.com"
      },
      "models": {
        "deepseek-v4-pro": {
          "id": "deepseek-v4-pro",
          "name": "DeepSeek V4 Pro",
          "tool_call": true,
          "limit": { "context": 128000, "output": 8192 }
        }
      }
    }
  }
}
```

The extension will register a `deepseek` provider in pi with the `deepseek-v4-pro` model ready to use.

## Notes

- All providers are registered with `api: "openai-completions"`. This works for most OpenAI-compatible APIs. If a provider uses a different API format, you may need a custom `streamSimple` implementation.
- `cost` fields are set to `0` since OpenCode config doesn't include pricing info.
- The extension reads config at startup. If you change your OpenCode config, restart pi or use `/reload`.
- Built-in pi providers (like `anthropic`, `openai`, `google`) are not affected — only custom providers from your OpenCode config are registered.

## License

MIT
