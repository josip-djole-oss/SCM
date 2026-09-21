function createRealtime({ sessions, canAccessSite }) {
  const clients = new Set();
  let sequence = 0;
  function send(client, type, data) {
    if (client.res.destroyed || client.res.writableEnded) return;
    client.res.write(`id: ${++sequence}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  function publish(type, data = {}, scope = {}) {
    for (const client of clients) {
      const session = sessions.get(client.sessionId);
      if (!session) { client.res.end(); clients.delete(client); continue; }
      if (scope.email && scope.email !== session.email) continue;
      if (scope.site && !canAccessSite(session, scope.site)) continue;
      send(client, type, data);
    }
  }
  function connect(req, res) {
    res.setTimeout(0);
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const client = { res, sessionId: req.session.id };
    clients.add(client);
    send(client, 'connected', { resync: true });
    const heartbeat = setInterval(() => {
      const session = sessions.get(client.sessionId);
      if (!session || session.expiresAt <= Date.now()) return res.end();
      res.write(': heartbeat\n\n');
    }, 25000);
    heartbeat.unref();
    res.on('close', () => { clearInterval(heartbeat); clients.delete(client); });
  }
  return { connect, publish };
}
module.exports = { createRealtime };
