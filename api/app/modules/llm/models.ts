// Curated subset of Venice text models. Full catalog: https://docs.venice.ai/models/text
export const VENICE_MODELS = [
  "deepseek-v4-flash",
  "zai-org-glm-4.7",
  "zai-org-glm-4.7-flash",
  "zai-org-glm-5",
  "grok-41-fast",
  "llama-3.2-3b",
] as const;

export type VeniceModel = (typeof VENICE_MODELS)[number];
