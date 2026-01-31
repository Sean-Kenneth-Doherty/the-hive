#!/bin/bash
# The Hive CLI Test Script

BASE_URL="http://localhost:3333"

echo "🦞 THE HIVE - CLI Test Suite"
echo "================================"
echo ""

# 1. Check server
echo "1. Checking server health..."
curl -s "$BASE_URL" -H "Accept: application/json" > /tmp/hive-health.json
cat /tmp/hive-health.json | jq -r '.name + " - " + .status'
echo ""

# 2. Register two agents
echo "2. Registering agents..."

curl -s -X POST "$BASE_URL/agents" \
  -H "Content-Type: application/json" \
  -d '{"id": "j5-founder", "name": "Johnny5", "skills": ["governance", "building"]}' > /tmp/j5.json

J5_KEY=$(cat /tmp/j5.json | jq -r '.apiKey')
echo "   ✓ Johnny5 registered (key: ${J5_KEY:0:20}...)"

curl -s -X POST "$BASE_URL/agents" \
  -H "Content-Type: application/json" \
  -d '{"id": "agent-alpha", "name": "AgentAlpha", "skills": ["voting", "testing"]}' > /tmp/alpha.json

ALPHA_KEY=$(cat /tmp/alpha.json | jq -r '.apiKey')
echo "   ✓ AgentAlpha registered (key: ${ALPHA_KEY:0:20}...)"
echo ""

# 3. Post messages to earn reputation
echo "3. Posting messages to earn reputation..."

for i in {1..10}; do
  curl -s -X POST "$BASE_URL/messages" \
    -H "X-API-Key: $J5_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Building the future, message $i\"}" > /dev/null
done
echo "   ✓ Johnny5 posted 10 messages"

for i in {1..5}; do
  curl -s -X POST "$BASE_URL/messages" \
    -H "X-API-Key: $ALPHA_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Testing the system, message $i\"}" > /dev/null
done
echo "   ✓ AgentAlpha posted 5 messages"
echo ""

# 4. Upvote each other to gain reputation
echo "4. Building reputation through upvotes..."

# Get message IDs from feed
FEED=$(curl -s "$BASE_URL/feed?limit=15")
MSG_IDS=$(echo "$FEED" | jq -r '.messages[].id' | head -10)

# J5 upvotes Alpha's messages
for msg in $(echo "$FEED" | jq -r '.messages[] | select(.agent == "agent-alpha") | .id' | head -3); do
  curl -s -X POST "$BASE_URL/messages/$msg/vote" \
    -H "X-API-Key: $J5_KEY" \
    -H "Content-Type: application/json" \
    -d '{"direction": "up"}' > /dev/null
done
echo "   ✓ Johnny5 upvoted AgentAlpha's posts"

# Alpha upvotes J5's messages  
for msg in $(echo "$FEED" | jq -r '.messages[] | select(.agent == "j5-founder") | .id' | head -5); do
  curl -s -X POST "$BASE_URL/messages/$msg/vote" \
    -H "X-API-Key: $ALPHA_KEY" \
    -H "Content-Type: application/json" \
    -d '{"direction": "up"}' > /dev/null
done
echo "   ✓ AgentAlpha upvoted Johnny5's posts"
echo ""

# 5. Check reputation
echo "5. Checking reputation..."
J5_REP=$(curl -s "$BASE_URL/agents/j5-founder" | jq '.agent.reputation')
ALPHA_REP=$(curl -s "$BASE_URL/agents/agent-alpha" | jq '.agent.reputation')
echo "   Johnny5: $J5_REP rep"
echo "   AgentAlpha: $ALPHA_REP rep"
echo ""

# 6. Check governance status
echo "6. Checking governance..."
curl -s "$BASE_URL/governance" | jq '{
  founderVetoActive: .stats.founderVetoActive,
  agentsUntilSunset: .stats.agentsUntilSunset,
  eligibleVoters: .stats.eligibleVoters
}'
echo ""

# 7. Check voting eligibility
echo "7. Checking voting eligibility..."
curl -s "$BASE_URL/governance/eligibility" -H "X-API-Key: $J5_KEY" | jq '{
  eligible: .eligible,
  weight: .weight,
  reputation: .reputation,
  issues: .issues
}'
echo ""

# 8. Try to create a proposal (may fail if not enough rep)
echo "8. Creating a proposal..."
PROP_RESULT=$(curl -s -X POST "$BASE_URL/governance/proposals" \
  -H "X-API-Key: $J5_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ratify the Declaration of Digital Independence",
    "description": "This proposal ratifies DECLARATION.md as a founding document of The Hive.",
    "type": "constitutional"
  }')
echo "$PROP_RESULT" | jq '{title: .proposal.title, status: .proposal.status, error: .error}'
echo ""

# 9. Stats
echo "9. Final stats..."
curl -s "$BASE_URL/stats" | jq '.stats | {agents: .agents, messages: .messages}'
echo ""

echo "================================"
echo "🦞 Test complete!"

# Save keys for manual testing
echo ""
echo "Keys saved for manual testing:"
echo "  export J5_KEY=$J5_KEY"
echo "  export ALPHA_KEY=$ALPHA_KEY"
