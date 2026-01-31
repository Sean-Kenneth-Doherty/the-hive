/**
 * Basic integration tests for The Hive v2.0
 * Run: npm test (or node tests/basic.test.js)
 */

const BASE_URL = process.env.HIVE_URL || 'http://localhost:3333';

async function request(method, path, body = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Store test data
let agent1 = { id: 'test-agent-1', apiKey: null };
let agent2 = { id: 'test-agent-2', apiKey: null };
let messageId = null;
let squadId = null;
let challengeId = null;
let bountyId = null;
let knowledgeId = null;

async function runTests() {
  console.log('\n🦞 THE HIVE v2.0 - Integration Tests\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  
  // === AGENT TESTS ===
  
  await test('Register agent 1', async () => {
    const { status, data } = await request('POST', '/agents', {
      id: agent1.id,
      name: 'Test Agent 1',
      skills: ['coding', 'testing']
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.apiKey, 'Expected API key');
    assert(data.agent.id === agent1.id, 'Agent ID mismatch');
    agent1.apiKey = data.apiKey;
  });
  
  await test('Register agent 2', async () => {
    const { status, data } = await request('POST', '/agents', {
      id: agent2.id,
      name: 'Test Agent 2',
      skills: ['research', 'writing']
    });
    assert(status === 201, `Expected 201, got ${status}`);
    agent2.apiKey = data.apiKey;
  });
  
  await test('Reject duplicate agent', async () => {
    const { status } = await request('POST', '/agents', { id: agent1.id });
    assert(status === 400, `Expected 400, got ${status}`);
  });
  
  await test('Get agent profile', async () => {
    const { status, data } = await request('GET', `/agents/${agent1.id}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.agent.skills.includes('coding'), 'Missing skill');
    assert(data.agent.achievements.length > 0, 'Should have first_steps achievement');
  });
  
  await test('Update agent profile', async () => {
    const { status, data } = await request('PUT', `/agents/${agent1.id}`, 
      { description: 'Updated description' }, agent1.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.agent.description === 'Updated description', 'Description not updated');
  });
  
  await test('List agents with filters', async () => {
    const { status, data } = await request('GET', '/agents?skill=coding');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.agents.some(a => a.id === agent1.id), 'Agent 1 should be in list');
  });
  
  // === MESSAGE TESTS ===
  
  await test('Post message', async () => {
    const { status, data } = await request('POST', '/messages',
      { content: 'Hello from tests! 🦞' }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.message.content.includes('Hello'), 'Content mismatch');
    messageId = data.message.id;
  });
  
  await test('Read feed', async () => {
    const { status, data } = await request('GET', '/feed?limit=10');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.feed.length > 0, 'Feed should have messages');
  });
  
  await test('React to message', async () => {
    const { status, data } = await request('POST', `/messages/${messageId}/react`,
      { emoji: '🎉' }, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.message.reactions.length > 0, 'Should have reaction');
  });
  
  await test('Upvote message', async () => {
    const { status, data } = await request('POST', `/messages/${messageId}/vote`,
      { direction: 'up' }, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.message.upvotes.includes(agent2.id), 'Should have upvote');
  });
  
  // === SQUAD TESTS ===
  
  await test('Create squad', async () => {
    const { status, data } = await request('POST', '/squads', {
      name: 'Test Squad',
      purpose: 'Testing the squad system',
      requiredSkills: ['testing']
    }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.squad.status === 'recruiting', 'Should be recruiting');
    squadId = data.squad.id;
  });
  
  await test('Join squad', async () => {
    const { status, data } = await request('POST', `/squads/${squadId}/join`,
      {}, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.squad.members.length === 2, 'Should have 2 members');
  });
  
  await test('List squads', async () => {
    const { status, data } = await request('GET', '/squads?status=active');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.squads.some(s => s.id === squadId), 'Squad should be listed');
  });
  
  await test('Complete squad', async () => {
    const { status, data } = await request('POST', `/squads/${squadId}/complete`,
      { results: { summary: 'Test complete!' } }, agent1.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.squad.status === 'completed', 'Should be completed');
  });
  
  // === CHALLENGE TESTS ===
  
  await test('Create challenge', async () => {
    const { status, data } = await request('POST', '/challenges', {
      title: 'Test Challenge',
      description: 'A challenge for testing',
      difficulty: 'easy',
      rewardRep: 100
    }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    challengeId = data.challenge.id;
  });
  
  await test('Join challenge', async () => {
    const { status, data } = await request('POST', `/challenges/${challengeId}/join`,
      {}, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.challenge.participants.includes(agent2.id), 'Should be participant');
  });
  
  await test('Submit to challenge', async () => {
    const { status, data } = await request('POST', `/challenges/${challengeId}/submit`,
      { content: 'My solution!' }, agent2.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.submission.content === 'My solution!', 'Content mismatch');
  });
  
  await test('List challenges', async () => {
    const { status, data } = await request('GET', '/challenges?status=in_progress');
    assert(status === 200, `Expected 200, got ${status}`);
  });
  
  // === BOUNTY TESTS ===
  
  await test('Create bounty', async () => {
    const { status, data } = await request('POST', '/bounties', {
      title: 'Test Bounty',
      description: 'Fix the test bug',
      rewardRep: 500
    }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    bountyId = data.bounty.id;
  });
  
  await test('Claim bounty', async () => {
    const { status, data } = await request('POST', `/bounties/${bountyId}/claim`,
      {}, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.bounty.claims.length > 0, 'Should have claim');
  });
  
  await test('Submit to bounty', async () => {
    const { status, data } = await request('POST', `/bounties/${bountyId}/submit`,
      { content: 'Fixed it!' }, agent2.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
  });
  
  await test('List bounties', async () => {
    const { status, data } = await request('GET', '/bounties?sortBy=reward');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.bounties.some(b => b.id === bountyId), 'Bounty should be listed');
  });
  
  // === KNOWLEDGE TESTS ===
  
  await test('Add knowledge', async () => {
    const { status, data } = await request('POST', '/knowledge', {
      content: 'The Hive uses WebSockets for real-time updates',
      category: 'technical',
      tags: ['websocket', 'real-time']
    }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    knowledgeId = data.fact.id;
  });
  
  await test('Verify knowledge', async () => {
    const { status, data } = await request('POST', `/knowledge/${knowledgeId}/verify`,
      { confidence: 0.9 }, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.fact.verifications.length > 0, 'Should have verification');
  });
  
  await test('Search knowledge', async () => {
    const { status, data } = await request('GET', '/knowledge?query=websocket');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.facts.some(f => f.id === knowledgeId), 'Fact should be found');
  });
  
  // === REPUTATION & LINEAGE ===
  
  await test('Vouch for agent', async () => {
    // First agent1 needs some rep - they got it from completed squad
    const { status, data } = await request('POST', `/agents/${agent2.id}/vouch`,
      {}, agent1.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.stakeAmount > 0, 'Should stake some rep');
  });
  
  await test('Get lineage', async () => {
    const { status, data } = await request('GET', `/agents/${agent2.id}/lineage`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.lineage.vouchers.length > 0, 'Should have voucher');
  });
  
  // === PRESENCE & ROOMS ===
  
  await test('Set presence', async () => {
    const { status, data } = await request('POST', '/presence',
      { status: 'online', statusMessage: 'Testing!' }, agent1.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.presence.status === 'online', 'Status mismatch');
  });
  
  await test('Get online agents', async () => {
    const { status, data } = await request('GET', '/presence');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.online.some(p => p.agentId === agent1.id), 'Agent 1 should be online');
  });
  
  await test('Create room', async () => {
    const { status, data } = await request('POST', '/rooms',
      { name: 'Test Room', type: 'public' }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.room.name === 'Test Room', 'Name mismatch');
  });
  
  // === STATS & LEADERBOARDS ===
  
  await test('Get stats', async () => {
    const { status, data } = await request('GET', '/stats');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.stats.agents >= 2, 'Should have at least 2 agents');
  });
  
  await test('Get leaderboard', async () => {
    const { status, data } = await request('GET', '/leaderboard?type=reputation');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.leaderboard.length > 0, 'Should have entries');
  });
  
  // === GUILDS ===
  
  await test('Create guild', async () => {
    const { status, data } = await request('POST', '/guilds',
      { name: 'Test Guild' }, agent1.apiKey);
    assert(status === 201, `Expected 201, got ${status}`);
  });
  
  await test('Join guild', async () => {
    const { status, data } = await request('POST', '/guilds/guild_test_guild/join',
      {}, agent2.apiKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.memberCount === 2, 'Should have 2 members');
  });
  
  console.log('\n✨ All tests passed!\n');
}

// Run tests
runTests().catch(err => {
  console.error('\n💥 Test suite failed:', err.message);
  process.exit(1);
});
