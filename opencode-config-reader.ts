import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

interface OpenCodeModel {
  id: string
  name: string
  family?: string
  tool_call?: boolean
  interleaved?: { field: string }
  limit?: { context?: number; output?: number }
}

interface OpenCodeProvider {
  api?: string
  name?: string
  options?: { apiKey?: string; baseURL?: string }
  models?: Record<string, OpenCodeModel>
}

interface OpenCodeConfig {
  provider?: Record<string, OpenCodeProvider>
}

function resolveConfigPath(): string | null {
  const candidates: string[] = []

  // Project-level: ./opencode.json or ./opencode.jsonc
  candidates.push(join(process.cwd(), "opencode.json"))
  candidates.push(join(process.cwd(), "opencode.jsonc"))

  // XDG_CONFIG_HOME
  const xdgConfig = process.env.XDG_CONFIG_HOME
  if (xdgConfig) {
    candidates.push(join(xdgConfig, "opencode", "opencode.json"))
    candidates.push(join(xdgConfig, "opencode", "opencode.jsonc"))
  }

  // Default ~/.config/opencode/
  const home = homedir()
  candidates.push(join(home, ".config", "opencode", "opencode.json"))
  candidates.push(join(home, ".config", "opencode", "opencode.jsonc"))

  // Legacy ~/.opencode/config.json
  candidates.push(join(home, ".opencode", "config.json"))

  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function loadOpenCodeConfig(): OpenCodeConfig | null {
  const configPath = resolveConfigPath()
  if (!configPath) return null
  try {
    const content = readFileSync(configPath, "utf-8")
    // Strip JSONC comments and trailing commas
    const cleaned = content
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([\]}])/g, "$1")
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function isImageModel(m: OpenCodeModel): boolean {
  const modalities = (m as Record<string, unknown>).modalities as
    | { input?: string[] }
    | undefined
  return !!modalities?.input?.includes("image")
}

export default function (pi: ExtensionAPI) {
  const config = loadOpenCodeConfig()
  if (!config?.provider) return

  for (const [providerName, provider] of Object.entries(config.provider)) {
    if (!provider.options?.baseURL || !provider.models) continue

    const models = Object.values(provider.models).map((m) => ({
      id: m.id,
      name: m.name,
      reasoning: !!m.interleaved,
      input: (isImageModel(m) ? ["text", "image"] : ["text"]) as (
        | "text"
        | "image"
      )[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: m.limit?.context ?? 128000,
      maxTokens: m.limit?.output ?? 8192,
    }))

    pi.registerProvider(providerName, {
      name: provider.name ?? providerName,
      baseUrl: provider.options.baseURL,
      apiKey: provider.options.apiKey ?? "",
      api: "openai-completions",
      models,
    })
  }
}
