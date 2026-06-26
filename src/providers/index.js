import { DeterministicProvider } from './deterministic-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';

export function createProvider(environment = process.env) {
  const name = environment.HAUNTED_STUDIO_PROVIDER ?? 'deterministic';
  if (name === 'deterministic') return new DeterministicProvider();
  if (name === 'openai') {
    return new OpenAIProvider({
      apiKey: environment.OPENAI_API_KEY,
      baseUrl: environment.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      textModel: environment.OPENAI_TEXT_MODEL ?? 'gpt-5.5',
      imageModel: environment.OPENAI_IMAGE_MODEL ?? 'gpt-image-2'
    });
  }
  if (name === 'anthropic') {
    return new AnthropicProvider({
      apiKey: environment.ANTHROPIC_API_KEY,
      baseUrl: environment.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
      model: environment.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      maxTokens: Number(environment.ANTHROPIC_MAX_TOKENS ?? 4096)
    });
  }
  throw new Error(`Unknown provider: ${name}`);
}
