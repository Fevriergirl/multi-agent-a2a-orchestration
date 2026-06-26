import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runProofOfLife } from '../scripts/proof-a2a.js';

test('A2A proof: the mailbox message is consumed and appears in the final artifact', async () => {
  // Isolated studio + outputs so the test never touches real run state.
  const studioHome = await mkdtemp(path.join(os.tmpdir(), 'a2a-proof-home-'));
  const outputsDir = await mkdtemp(path.join(os.tmpdir(), 'a2a-proof-out-'));

  const proof = await runProofOfLife({ studioHome, outputsDir });

  // The mailbox message was consumed and logged as such.
  const consumed = proof.events.find((event) => event.type === 'mailbox_observations_consumed');
  assert.ok(consumed, 'expected a mailbox_observations_consumed ledger event');
  assert.ok(
    consumed.payload.message_ids.includes(proof.message.message_id),
    'consumed event must reference the posted observer message id'
  );

  // The attention agent selected the consumed observer message for this cycle.
  assert.equal(proof.result.attention.observation.id, proof.observation.id);

  // The observer text actually appears in the saved, human-readable artifact.
  const markdown = await readFile(proof.markdownPath, 'utf8');
  assert.ok(
    markdown.includes(proof.observation.text),
    'the observer message text must appear in a2a-proof-of-life.md'
  );

  // The ledger remained valid through the whole flow.
  assert.equal(proof.result.verification.valid, true);
});
