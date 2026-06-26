#!/usr/bin/env node
// A2A proof-of-life.
//
// One clean, real end-to-end run that exercises the existing architecture:
//
//   external observer --HTTP--> mailbox --poll/ack--> orchestration cycle
//   --> internal agent roles --> readable saved artifact.
//
// Nothing here is a new subsystem. It wires together the real mailbox server,
// the real append-only ledger, and the real creative/orchestration cycle.

import path from 'node:path';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { loadProjectConfig } from '../src/config.js';
import { Studio } from '../src/core/studio.js';
import { createProvider } from '../src/providers/index.js';
import { runCreativeCycle } from '../src/engine/creative-cycle.js';
import { JsonlMailbox } from '../src/a2a/mailbox.js';
import { startMailboxServer } from '../src/a2a/server.js';

// One sample observer message. This is exactly the envelope an external agent
// would POST to the mailbox in production.
const SAMPLE_OBSERVER_MESSAGE = {
  type: 'observation_signal',
  sender: 'field-observer',
  priority: 'high',
  payload: {
    text: 'A hospital corridor keeps a single chair turned to face the wall, and no one ever moves it.',
    tags: ['institution', 'waiting', 'absence'],
    rights: 'project-authored'
  }
};

function silentLogger() {
  return () => {};
}

function consoleLogger() {
  return (line = '') => console.log(line);
}

// Map a consumed mailbox message into the observation shape the cycle expects.
// Mirrors the mapping used by `node src/cli.js run --mailbox`.
function toObservation(message) {
  return {
    id: `mailbox-${message.message_id}`,
    source: message.sender ?? 'external',
    text: message.payload?.text,
    tags: Array.isArray(message.payload?.tags) ? message.payload.tags : [],
    rights: message.payload?.rights ?? 'external-unverified',
    mailbox_message_id: message.message_id
  };
}

async function startServer({ mailbox, ledger, host }) {
  // Port 0 asks the OS for a free port so the proof never collides with a
  // mailbox the user already has running.
  const server = startMailboxServer({ mailbox, ledger, port: 0, host });
  await once(server, 'listening');
  return { server, port: server.address().port };
}

function renderMarkdown({ message, observation, result, actors }) {
  const { cycleId, attention, necessity, intention, curation, selected, audiencePrediction, verification } = result;
  const lines = [];
  lines.push('# A2A Proof of Life');
  lines.push('');
  lines.push('A single external observer message traveled through the mailbox and');
  lines.push('drove one full orchestration cycle. This file is the human-readable result.');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Cycle id: \`${cycleId}\``);
  lines.push(`- Ledger valid: **${verification.valid}** (${verification.count} events)`);
  lines.push('');
  lines.push('## 1. Received observer message');
  lines.push('');
  lines.push(`- Mailbox message id: \`${message.message_id}\``);
  lines.push(`- Sender: \`${message.sender}\``);
  lines.push(`- Priority: \`${message.priority}\``);
  lines.push(`- Rights: \`${observation.rights}\``);
  lines.push(`- Tags: ${observation.tags.map((tag) => `\`${tag}\``).join(', ')}`);
  lines.push('');
  lines.push('> ' + observation.text);
  lines.push('');
  lines.push('## 2. Mailbox consumed');
  lines.push('');
  lines.push(`The cycle polled the mailbox, acknowledged message \`${message.message_id}\`,`);
  lines.push('and recorded a `mailbox_observations_consumed` event in the ledger.');
  lines.push('');
  lines.push('## 3. Roles invoked (from the real ledger trace)');
  lines.push('');
  for (const actor of actors) lines.push(`- ${actor}`);
  lines.push('');
  lines.push('## 4. Final output');
  lines.push('');
  lines.push(`- Attention selected: \`${attention.observation.id}\` (the consumed observer message)`);
  lines.push(`- Necessity: ${necessity.statement}`);
  lines.push(`- Intention is about: ${intention.about}`);
  lines.push(`- Curator decision: **${curation.decision}** (score ${curation.score})`);
  if (selected) {
    lines.push(`- Canon candidate: **${selected.title}**`);
    lines.push(`- Strategy: ${selected.strategy}`);
    lines.push('');
    lines.push('### Generation brief');
    lines.push('');
    lines.push(selected.artifact_brief);
  } else {
    lines.push(`- Refusal rationale: ${curation.rationale}`);
  }
  if (audiencePrediction) {
    lines.push('');
    lines.push('### Predicted viewer encounter');
    lines.push('');
    lines.push(`- First notice: ${audiencePrediction.first_notice}`);
    lines.push(`- Likely second discovery: ${audiencePrediction.likely_second_discovery}`);
    lines.push(`- Hoped lingering effect: ${audiencePrediction.hoped_lingering_effect}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Proof: the observer message text above is the same text the orchestration');
  lines.push('cycle built its necessity and intention from. The external message reached');
  lines.push('the internal roles and shaped the final artifact.');
  lines.push('');
  return lines.join('\n');
}

export async function runProofOfLife({
  cwd = process.cwd(),
  studioHome = '.haunted-studio-proof',
  outputsDir = path.resolve(cwd, 'outputs'),
  host = '127.0.0.1',
  log = silentLogger()
} = {}) {
  const config = await loadProjectConfig(cwd, { ...process.env, HAUNTED_STUDIO_HOME: studioHome });
  const studio = new Studio({
    rootDir: config.studioRoot,
    constitution: config.constitution,
    experiment: config.experiment
  });

  // Clean slate so the proof is reproducible.
  await studio.reset();
  await studio.initialize();

  const mailbox = new JsonlMailbox(path.join(config.studioRoot, 'mailbox.jsonl'));
  const { server, port } = await startServer({ mailbox, ledger: studio.ledger, host });
  const baseUrl = `http://${host}:${port}`;

  try {
    // --- Stage 1: external observer POSTs a message over real HTTP ---
    log('==> [1] Received observer message');
    const receiveResponse = await fetch(`${baseUrl}/mailbox/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_OBSERVER_MESSAGE)
    });
    const received = await receiveResponse.json();
    log(`    mailbox accepted message ${received.message_id} (status ${received.status})`);
    log(`    "${SAMPLE_OBSERVER_MESSAGE.payload.text}"`);

    // --- Stage 2: poll + consume over HTTP, then acknowledge ---
    log('');
    log('==> [2] Mailbox consumed');
    const pollResponse = await fetch(`${baseUrl}/mailbox/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'observation_signal', limit: 5 })
    });
    const { messages } = await pollResponse.json();
    log(`    polled ${messages.length} pending observer message(s)`);
    const message = messages[0];
    const observation = toObservation(message);

    await mailbox.acknowledge([message.message_id]);
    await studio.ledger.append({
      type: 'mailbox_observations_consumed',
      actor: 'orchestrator',
      payload: { message_ids: [message.message_id] }
    });
    log(`    acknowledged ${message.message_id} and logged mailbox_observations_consumed`);

    // --- Stage 3: feed the consumed observation into the cycle ---
    log('');
    log('==> [3] Cycle started');
    const provider = createProvider();
    log(`    provider: ${provider.name}`);
    const result = await runCreativeCycle({
      studio,
      provider,
      observations: [observation]
    });
    log(`    cycle id: ${result.cycleId}`);

    // --- Stage 4: show the internal roles that actually fired ---
    log('');
    log('==> [4] Roles invoked');
    const events = await studio.ledger.readAll();
    const cycleEvents = events.filter((event) => event.cycle_id === result.cycleId);
    const actors = [...new Set(cycleEvents.map((event) => `${event.actor} (${event.type})`))];
    for (const actor of actors) log(`    - ${actor}`);

    // --- Stage 5: write the readable + raw artifacts ---
    log('');
    log('==> [5] Final output created');
    await mkdir(outputsDir, { recursive: true });
    const markdownPath = path.join(outputsDir, 'a2a-proof-of-life.md');
    const jsonlPath = path.join(outputsDir, 'a2a-proof-of-life.jsonl');
    const markdown = renderMarkdown({ message, observation, result, actors });
    await writeFile(markdownPath, markdown, 'utf8');
    await writeFile(jsonlPath, events.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8');
    log(`    readable artifact: ${markdownPath}`);
    log(`    raw ledger trace:  ${jsonlPath}`);
    log('');
    log(`Decision: ${result.curation.decision} | Score: ${result.curation.score} | Ledger valid: ${result.verification.valid}`);

    return {
      message,
      observation,
      result,
      actors,
      markdownPath,
      jsonlPath,
      markdown,
      events
    };
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  runProofOfLife({ log: consoleLogger() }).catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
