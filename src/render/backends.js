import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../core/fs.js';
import { writeArtifact, auditArtifact } from './artifact.js';

// The image backend is chosen independently of the reasoning provider, so any
// provider (deterministic, Claude) can render either with the built-in offline
// renderer or with a live photoreal image API — flipped by one env var:
//
//   HAUNTED_STUDIO_IMAGE=offline   (default) -> src/render/artifact.js
//   HAUNTED_STUDIO_IMAGE=openai              -> OpenAI Images API
//
// In every case the visual audit reads the pixels that were actually produced
// (auditArtifact), so a photoreal render is judged on the image, not the prompt.

async function generateOpenAIImage({ apiKey, baseUrl, model, prompt, outputPath }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1024x1024', output_format: 'png' })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI Images API failed (${response.status}): ${body}`);
  }
  const result = await response.json();
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error('The Images API response did not contain base64 image data.');
  await ensureDir(path.dirname(outputPath));
  await writeFile(outputPath, Buffer.from(base64, 'base64'));
  return outputPath;
}

export function createImageBackend(environment = process.env) {
  const name = environment.HAUNTED_STUDIO_IMAGE ?? 'offline';

  if (name === 'offline') {
    return {
      name: 'offline',
      generate: ({ prompt, outputPath }) => writeArtifact({ prompt, outputPath }),
      audit: (args) => auditArtifact(args)
    };
  }

  if (name === 'openai') {
    const apiKey = environment.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required when HAUNTED_STUDIO_IMAGE=openai.');
    const baseUrl = environment.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const model = environment.OPENAI_IMAGE_MODEL ?? 'gpt-image-2';
    return {
      name: 'openai-image',
      generate: ({ prompt, outputPath }) => generateOpenAIImage({ apiKey, baseUrl, model, prompt, outputPath }),
      // Audit the produced pixels offline — no second (vision) API call needed.
      audit: (args) => auditArtifact(args)
    };
  }

  throw new Error(`Unknown image backend: ${name}`);
}
