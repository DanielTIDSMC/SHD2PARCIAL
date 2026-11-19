import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const webpush = require('web-push');

const clients = new Map();
const subscriptions = new Map();
const port = Number(process.env.PORT || process.env.REALTIME_PORT || 3001);

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  throw new Error('Missing VAPID keys. Copy the provided .env.example to .env and set the keys.');
}
const configuredSubject = (process.env.VAPID_SUBJECT || 'mailto:admin@example.com').trim();
const vapidSubject = configuredSubject.includes('@') && !configuredSubject.startsWith('mailto:')
  ? `mailto:${configuredSubject}`
  : configuredSubject;
webpush.setVapidDetails(vapidSubject, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const server = createServer((req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  if (req.method === 'POST' && req.url === '/api/subscribe') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const subscription = JSON.parse(body);
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) throw new Error('Invalid subscription');
        subscriptions.set(subscription.endpoint, subscription);
        res.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify({ subscribed: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid subscription' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/push') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { title, body: message } = JSON.parse(body);
        if (!title || !message) throw new Error('Invalid payload');
        const payload = JSON.stringify({ title, body: message });
        const results = await Promise.allSettled([...subscriptions.entries()].map(async ([endpoint, subscription]) => {
          try { await webpush.sendNotification(subscription, payload); }
          catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) subscriptions.delete(endpoint);
            else throw error;
          }
        }));
        const sent = results.filter((result) => result.status === 'fulfilled').length;
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ enviadas: sent }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Unable to send push notification' }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url?.startsWith('/api/subscribe?endpoint=')) {
    const endpoint = decodeURIComponent(req.url.slice('/api/subscribe?endpoint='.length));
    subscriptions.delete(endpoint);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ unsubscribed: true }));
    return;
  }

  if (req.method === 'GET' && req.url === '/events') {
    const id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('source') || randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ id })}\n\n`);
    clients.set(id, res);
    req.on('close', () => clients.delete(id));
    return;
  }

  if (req.method === 'POST' && req.url === '/events') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        if (!event.source || !event.title || !event.message) throw new Error('Invalid event');
        const payload = `event: change\ndata: ${JSON.stringify({ ...event, id: randomUUID(), at: Date.now() })}\n\n`;
        for (const [id, client] of clients) if (id !== event.source) client.write(payload);
        res.writeHead(202, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sent: clients.size - 1 }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid event payload' }));
      }
    });
    return;
  }

  res.writeHead(404).end('Not found');
});

server.listen(port, '0.0.0.0', () => console.log(`Realtime server listening on http://localhost:${port}`));
