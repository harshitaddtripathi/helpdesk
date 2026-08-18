import { env } from "./env";

const defaultGoogleGenerativeAiModel = "gemini-3.5-flash";
const retiredGoogleGenerativeAiModels = new Set(["gemini-2.0-flash"]);

export function getGoogleGenerativeAiModel() {
  if (retiredGoogleGenerativeAiModels.has(env.GOOGLE_GENERATIVE_AI_MODEL)) {
    return defaultGoogleGenerativeAiModel;
  }

  return env.GOOGLE_GENERATIVE_AI_MODEL || defaultGoogleGenerativeAiModel;
}
