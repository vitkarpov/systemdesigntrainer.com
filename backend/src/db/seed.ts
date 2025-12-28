import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  interviewCases,
  interviewSessions,
  transcriptMessages,
  interviewSignals,
  interviewRedFlags,
  diagramSnapshots,
  diagramElements,
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
} from './schema';

/**
 * Development/Test seed - creates test users and sample sessions
 * WARNING: This deletes all existing data! Use seed-interview-cases.ts for production
 */
async function seed() {
  console.log('⚠️  WARNING: This will delete all existing data!');
  console.log('Cleaning up database...');

  // Delete existing data in correct order (respecting foreign key constraints)
  // Start with the most nested dependencies
  await db.delete(diagramElements);
  await db.delete(diagramSnapshots);
  await db.delete(feedbackItems);
  await db.delete(feedbackNextSteps);
  await db.delete(feedbackReports);
  await db.delete(interviewSignals);
  await db.delete(interviewRedFlags);
  await db.delete(transcriptMessages);
  await db.delete(interviewSessions);
  await db.delete(users);

  console.log('Database cleaned. Seeding test data...');

  // Create test user for development
  const [testUser] = await db
    .insert(users)
    .values({
      workosUserId: 'user_01KCSHQ4NNV3YBRK3KX53N5QQY',
      email: 'viktor@usesky.ai',
      name: 'Viktor Kovacevic',
      avatarUrl: null,
      subscriptionStatus: 'free',
      interviewsCompleted: 0,
      interviewsRemaining: 1,
    })
    .returning();

  console.log(`✓ Created test user: ${testUser.email}`);

  // Find an existing interview case to create a session with
  // (Assumes you've run seed-interview-cases.ts first)
  const existingCases = await db
    .select()
    .from(interviewCases)
    .where(eq(interviewCases.slug, 'url-shortener'))
    .limit(1);

  if (existingCases.length === 0) {
    console.log(
      '\n⚠️  No interview cases found. Please run seed-interview-cases.ts first:',
    );
    console.log('   npm run seed:cases\n');
    process.exit(1);
  }

  const urlShortenerCase = existingCases[0];
  console.log(`✓ Using case: ${urlShortenerCase.title}`);

  // Create an interview session in progress at the high-level phase
  const [session] = await db
    .insert(interviewSessions)
    .values({
      userId: testUser.id,
      caseId: urlShortenerCase.id,
      status: 'in_progress',
      startedAt: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
      completedAt: null,
      currentPhase: 'high_level',
      phaseStartedAt: new Date(Date.now() - 10 * 60 * 1000),
      companyStyle: 'faang',
      level: 'mid',
    })
    .returning();

  console.log(`Created interview session: ${session.id}`);

  // Create transcript messages (interview conversation up to high_level phase)
  const messages = [
    {
      sessionId: session.id,
      role: 'interviewer',
      text: "Let's design a URL shortening service like bit.ly. Take a moment to think about the problem and ask me any clarifying questions.",
      status: 'completed',
      phase: 'problem',
      secondsElapsed: 0,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "Great! Let me start by asking some clarifying questions. First, what are the functional requirements? Should we support custom short URLs? Do we need analytics? And for non-functional requirements, what's the expected scale - how many URLs will we shorten per day, and what's the expected read to write ratio?",
      status: 'completed',
      phase: 'requirements',
      secondsElapsed: 30,
    },
    {
      sessionId: session.id,
      role: 'interviewer',
      text: 'Good questions. For functional requirements: users should be able to shorten URLs and access them via short codes. Custom URLs are a nice-to-have but not required initially. Basic analytics would be good. For scale: assume 100 million URLs shortened per month, and reads are 100x more frequent than writes.',
      status: 'completed',
      phase: 'requirements',
      secondsElapsed: 90,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "Perfect. Let me also clarify constraints - any limitations on URL length? What about expiration - should short URLs last forever or expire? And for performance, what's an acceptable latency for redirects?",
      status: 'completed',
      phase: 'requirements',
      secondsElapsed: 120,
    },
    {
      sessionId: session.id,
      role: 'interviewer',
      text: 'URLs can be up to 2000 characters. For now, assume URLs last forever unless explicitly deleted. Redirects should be under 100ms ideally.',
      status: 'completed',
      phase: 'requirements',
      secondsElapsed: 150,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "Excellent. Now let me propose a high-level architecture. We'll need an API layer for creating short URLs, a database to store the mappings, and a caching layer since reads are so much more frequent. For the API, I'm thinking REST endpoints: POST /shorten to create a short URL, and GET /{shortCode} to redirect. We should use Redis for caching hot URLs to reduce database load.",
      status: 'completed',
      phase: 'high_level',
      secondsElapsed: 300,
    },
    {
      sessionId: session.id,
      role: 'interviewer',
      text: 'Sounds good. What about the database schema?',
      status: 'completed',
      phase: 'high_level',
      secondsElapsed: 330,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "For the data model, I'd have a URLs table with columns: id (primary key), short_code (indexed), original_url, created_at, and user_id if we want to track who created it. The short_code would be unique and indexed for fast lookups. We could use PostgreSQL for ACID guarantees.",
      status: 'completed',
      phase: 'high_level',
      secondsElapsed: 380,
    },
  ];

  const insertedMessages = await Promise.all(
    messages.map((msg) =>
      db.insert(transcriptMessages).values(msg).returning(),
    ),
  );

  console.log(`Created ${insertedMessages.length} transcript messages`);

  // Create interview signals (positive indicators for high_level phase)
  const signals = [
    {
      sessionId: session.id,
      signalName: 'asked_functional_reqs',
      phase: 'requirements',
      secondsElapsed: 30,
      triggeredByMessageId: insertedMessages[1][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'asked_non_functional_reqs',
      phase: 'requirements',
      secondsElapsed: 30,
      triggeredByMessageId: insertedMessages[1][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'clarified_constraints',
      phase: 'requirements',
      secondsElapsed: 120,
      triggeredByMessageId: insertedMessages[3][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'proposed_api',
      phase: 'high_level',
      secondsElapsed: 300,
      triggeredByMessageId: insertedMessages[5][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'drew_high_level_diagram',
      phase: 'high_level',
      secondsElapsed: 300,
      triggeredByMessageId: insertedMessages[5][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'discussed_data_model',
      phase: 'high_level',
      secondsElapsed: 380,
      triggeredByMessageId: insertedMessages[7][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'structured_approach',
      phase: 'requirements',
      secondsElapsed: 30,
      triggeredByMessageId: insertedMessages[1][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'asked_clarifying_questions',
      phase: 'requirements',
      secondsElapsed: 30,
      triggeredByMessageId: insertedMessages[1][0].id,
    },
  ];

  await db.insert(interviewSignals).values(signals);
  console.log(`✓ Created ${signals.length} interview signals`);

  // Create diagram snapshot and elements for URL shortener
  const [diagramSnapshot] = await db
    .insert(diagramSnapshots)
    .values({
      sessionId: session.id,
      phase: 'high_level',
      secondsElapsed: 300,
      snapshotAt: new Date(Date.now() - 8 * 60 * 1000), // Created 8 minutes ago
      createdAt: new Date(Date.now() - 8 * 60 * 1000),
    })
    .returning();

  console.log(`✓ Created diagram snapshot: ${diagramSnapshot.id}`);

  // Create diagram data for a high-level URL shortener architecture
  // The DiagramService stores all nodes and edges as JSON in a single element
  const nodes = [
    {
      id: 'client',
      type: 'box',
      position: { x: 100, y: 100 },
      data: { label: 'Client' },
      width: 120,
      height: 60,
    },
    {
      id: 'load-balancer',
      type: 'box',
      position: { x: 300, y: 100 },
      data: { label: 'Load Balancer' },
      width: 140,
      height: 60,
    },
    {
      id: 'api-servers',
      type: 'box',
      position: { x: 500, y: 100 },
      data: { label: 'API Servers\nPOST /shorten\nGET /{code}' },
      width: 150,
      height: 80,
    },
    {
      id: 'redis',
      type: 'box',
      position: { x: 700, y: 50 },
      data: { label: 'Redis Cache' },
      width: 130,
      height: 60,
    },
    {
      id: 'postgres',
      type: 'box',
      position: { x: 700, y: 150 },
      data: { label: 'PostgreSQL\nURLs table' },
      width: 130,
      height: 70,
    },
  ];

  const edges = [
    {
      id: 'edge-1',
      source: 'client',
      target: 'load-balancer',
      label: 'HTTP',
    },
    {
      id: 'edge-2',
      source: 'load-balancer',
      target: 'api-servers',
      label: '',
    },
    {
      id: 'edge-3',
      source: 'api-servers',
      target: 'redis',
      label: 'Check cache',
    },
    {
      id: 'edge-4',
      source: 'api-servers',
      target: 'postgres',
      label: 'Read/Write',
    },
  ];

  // Store as a single element with diagram_data type
  await db.insert(diagramElements).values({
    snapshotId: diagramSnapshot.id,
    elementType: 'diagram_data',
    label: JSON.stringify({ nodes, edges }),
  });

  console.log(`✓ Created diagram with ${nodes.length} nodes and ${edges.length} edges`);

  console.log('\n✅ Development seed completed!');
  console.log(`\nTest User: ${testUser.email}`);
  console.log(`Interview Session: ${session.id} (in_progress at 'high_level' phase)`);
  console.log(`Diagram Snapshot: ${diagramSnapshot.id} (with ${nodes.length} nodes and ${edges.length} edges)`);
  console.log(
    `\nYou can now use the app with this test data or continue the interview in the UI.`,
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
