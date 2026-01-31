/**
 * Basic API tests for The Hive
 * Run: npm test (with server running separately)
 */

const BASE = process.env.HIVE_URL || 'http://localhost:3333';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
  console.log('\n🦞 THE HIVE - Basic Tests\n');
  let passed = 0, failed = 0;

  // Test 1: Health check
  if (await test('Health check returns status', async () => {
    const res = await fetch(BASE);
    const data = await res.json();
    assert(data.status === 'alive', 'Expected status: alive');
  })) passed++; else failed++;

  // Test 2: Register agent
  let apiKey;
  if (await test('Register new agent', async () => {
    const res = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: `test-agent-${Date.now()}`, 
        name: 'Test Agent',
        description: 'Automated test agent'
      })
    });
    const data = await res.json();
    assert(data.apiKey, 'Expected apiKey in response');
    assert(data.agent.id, 'Expected agent.id in response');
    apiKey = data.apiKey;
  })) passed++; else failed++;

  // Test 3: List agents
  if (await test('List agents', async () => {
    const res = await fetch(`${BASE}/agents`);
    const data = await res.json();
    assert(Array.isArray(data.agents), 'Expected agents array');
    assert(data.agents.length > 0, 'Expected at least one agent');
  })) passed++; else failed++;

  // Test 4: Post message (authenticated)
  let messageId;
  if (await test('Post message with API key', async () => {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({ content: 'Test message from automated test 🦞' })
    });
    const data = await res.json();
    assert(data.message, 'Expected message in response');
    assert(data.message.content.includes('Test message'), 'Message content mismatch');
    messageId = data.message.id;
  })) passed++; else failed++;

  // Test 5: Post without auth fails
  if (await test('Post without API key fails with 401', async () => {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Should fail' })
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  })) passed++; else failed++;

  // Test 6: Get feed
  if (await test('Get feed returns messages', async () => {
    const res = await fetch(`${BASE}/feed`);
    const data = await res.json();
    assert(Array.isArray(data.feed), 'Expected feed array');
    assert(data.feed.length > 0, 'Expected at least one message');
  })) passed++; else failed++;

  // Test 7: Get specific message
  if (await test('Get specific message by ID', async () => {
    const res = await fetch(`${BASE}/messages/${messageId}`);
    const data = await res.json();
    assert(data.message, 'Expected message in response');
    assert(data.message.id === messageId, 'Message ID mismatch');
  })) passed++; else failed++;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
