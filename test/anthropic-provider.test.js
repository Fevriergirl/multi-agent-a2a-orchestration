import test from 'node:test';
import assert from 'node:assert/strict';
import { AnthropicProvider } from '../src/providers/anthropic-provider.js';
import { createProvider } from '../src/providers/index.js';

test('Anthropic provider parses JSON text from a Messages API response', async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url, request) => {
    assert.match(url, /\/messages$/);
    assert.equal(request.headers['x-api-key'], 'test');
    assert.equal(request.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(request.body);
    assert.equal(body.model, 'test-model');
    return new Response(JSON.stringify({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: JSON.stringify({
          observation: { id: 'obs', text: 'test' },
          score: 0.8,
          reasons: ['reason'],
          alternatives: []
        }) }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const provider = new AnthropicProvider({ apiKey: 'test', baseUrl: 'https://api.example/v1', model: 'test-model', maxTokens: 1024 });
  const result = await provider.selectObservation({ observations: [], state: {} });
  assert.equal(result.score, 0.8);
});

test('Anthropic provider surfaces a refusal stop reason', async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 });
  const provider = new AnthropicProvider({ apiKey: 'test', baseUrl: 'https://api.example/v1', model: 'test-model', maxTokens: 1024 });
  await assert.rejects(() => provider.formNecessity({}), /refusal/);
});

test('createProvider selects the Anthropic provider, which renders art offline', () => {
  const provider = createProvider({ HAUNTED_STUDIO_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'test' });
  assert.equal(provider.name, 'anthropic');
  // Claude has no image API, so the provider renders via the offline renderer:
  // Claude reasons, the local renderer makes the picture.
  assert.equal(typeof provider.generateArtifact, 'function');
  assert.equal(typeof provider.inspectArtifact, 'function');
});

test('createProvider requires an Anthropic key', () => {
  assert.throws(() => createProvider({ HAUNTED_STUDIO_PROVIDER: 'anthropic' }), /ANTHROPIC_API_KEY is required/);
});
