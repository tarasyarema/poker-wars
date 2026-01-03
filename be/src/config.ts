import { GameConfigSchema, type GameConfig } from "./types";

const DEFAULT_CONFIG_PATH = "./config.json";

export async function loadConfig(path: string = DEFAULT_CONFIG_PATH): Promise<GameConfig> {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new Error(`Config file not found: ${path}`);
  }

  const content = await file.json();
  return validateConfig(content);
}

export function validateConfig(config: unknown): GameConfig {
  const result = GameConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid config:\n${errors}`);
  }

  // Additional validation: ensure player indices are unique
  const indices = result.data.players.map((p) => p.index);
  const uniqueIndices = new Set(indices);
  if (indices.length !== uniqueIndices.size) {
    throw new Error("Invalid config: player indices must be unique");
  }

  return result.data;
}
