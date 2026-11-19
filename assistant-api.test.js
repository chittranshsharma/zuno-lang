const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAssistantRouter } = require('./assistant-api');

test('assistant keeps visitor keys isolated and rejects missing or invalid credentials', async t => {
  const received = [];
  const app = express();
  app.use(express.json());
  app.use('/api/assistant', createAssistantRouter(async (url, options) => {
    received.push(options.headers.Authorization);
    if (options.headers.Authorization === 'Bearer rejected-key') return { status: 401, ok: false };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Explanation' } }] }) };
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/assistant`;
  const ask = key => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify({ code: 'print(1);', question: 'Explain' }) });
  assert.equal((await ask()).status, 401);
  assert.equal(received.length, 0);
  for (const key of ['visitor-one', 'visitor-two']) {
    const response = await ask(key);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { answer: 'Explanation' });
  }
  const rejected = await ask('rejected-key');
  assert.equal(rejected.status, 401);
  assert.ok(!(await rejected.text()).includes('rejected-key'));
  assert.deepEqual(received, ['Bearer visitor-one', 'Bearer visitor-two', 'Bearer rejected-key']);
});

test('assistant forwards streaming chunks and bounded conversation history', async t => {
  const app = express();
  app.use(express.json());
  let received;
  app.use('/api/assistant', createAssistantRouter(async (url, options) => {
    received = JSON.parse(options.body);
    return new Response('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n', { headers:{'Content-Type':'text/event-stream'} });
  }));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/assistant`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-only'},body:JSON.stringify({code:'yap(1);',question:'Explain',stream:true,history:[{role:'user',content:'Earlier question'}]})});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  assert.match(await response.text(),/\[DONE\]/);
  assert.equal(received.stream,true);
  assert.equal(received.messages[1].content,'Earlier question');
});
