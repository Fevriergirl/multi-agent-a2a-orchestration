import http from 'node:http';

const MAX_BODY_BYTES = 1_000_000;

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body exceeds 1 MB.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function startMailboxServer({ mailbox, ledger, port = 19820, host = '127.0.0.1' }) {
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        return sendJson(response, 200, { status: 'ok' });
      }
      if (request.method === 'POST' && request.url === '/mailbox/receive') {
        const body = await readBody(request);
        if (!body.type) return sendJson(response, 400, { error: 'type is required' });
        const message = await mailbox.receive(body);
        await ledger.append({ type: 'a2a_message_received', actor: 'mailbox-server', payload: { message_id: message.message_id, message_type: message.type, sender: message.sender } });
        return sendJson(response, 202, { message_id: message.message_id, status: 'received' });
      }
      if (request.method === 'POST' && request.url === '/mailbox/poll') {
        const body = await readBody(request);
        return sendJson(response, 200, { messages: await mailbox.poll(body) });
      }
      if (request.method === 'POST' && request.url === '/mailbox/ack') {
        const body = await readBody(request);
        const count = await mailbox.acknowledge(body.message_ids ?? []);
        return sendJson(response, 200, { acknowledged: count });
      }
      return sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      const status = error.message.includes('1 MB') ? 413 : 500;
      return sendJson(response, status, { error: error.message });
    }
  });

  server.listen(port, host);
  return server;
}
