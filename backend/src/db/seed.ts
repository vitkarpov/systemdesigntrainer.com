import { db } from './db';
import {
  users,
  interviewCases,
  interviewCaseExpectations,
  interviewCaseTags,
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

async function seed() {
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
  await db.delete(interviewCaseTags);
  await db.delete(interviewCaseExpectations);
  await db.delete(interviewCases);
  await db.delete(users);

  console.log('Database cleaned. Seeding database...');

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

  console.log(`Created test user: ${testUser.email}`);
  // Create URL Shortener interview case
  const [urlShortenerCase] = await db
    .insert(interviewCases)
    .values({
      title: 'Design a URL Shortener',
      slug: 'url-shortener',
      description:
        'Design a scalable URL shortening service like bit.ly or TinyURL',
      difficulty: 'medium',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
    })
    .returning();

  console.log(`Created case: ${urlShortenerCase.title}`);

  // Add expectations
  const expectations = [
    {
      caseId: urlShortenerCase.id,
      expectationType: 'requirements',
      description:
        'Clarify functional requirements (URL generation, redirection, analytics)',
      displayOrder: 1,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'requirements',
      description:
        'Clarify non-functional requirements (latency, scale, availability)',
      displayOrder: 2,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'api',
      description:
        'Define REST API endpoints (POST /shorten, GET /{shortCode})',
      displayOrder: 3,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'data_model',
      description: 'Design database schema for URL mappings',
      displayOrder: 4,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'high_level',
      description:
        'Propose component architecture (API servers, database, cache)',
      displayOrder: 5,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'deep_dive',
      description:
        'Explain short code generation strategy (base62 encoding, hashing)',
      displayOrder: 6,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'deep_dive',
      description: 'Design caching strategy (Redis for hot URLs)',
      displayOrder: 7,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'scalability',
      description: 'Discuss horizontal scaling of API servers',
      displayOrder: 8,
    },
    {
      caseId: urlShortenerCase.id,
      expectationType: 'scalability',
      description: 'Address database partitioning/sharding strategy',
      displayOrder: 9,
    },
  ];

  await db.insert(interviewCaseExpectations).values(expectations);
  console.log(`Added ${expectations.length} expectations`);

  // Add tags
  const tags = [
    { caseId: urlShortenerCase.id, tag: 'web-services' },
    { caseId: urlShortenerCase.id, tag: 'scalability' },
    { caseId: urlShortenerCase.id, tag: 'caching' },
    { caseId: urlShortenerCase.id, tag: 'databases' },
    { caseId: urlShortenerCase.id, tag: 'api-design' },
  ];

  await db.insert(interviewCaseTags).values(tags);
  console.log(`Added ${tags.length} tags`);

  // Create an interview session in progress at the last stage
  const [session] = await db
    .insert(interviewSessions)
    .values({
      userId: testUser.id,
      caseId: urlShortenerCase.id,
      status: 'in_progress',
      startedAt: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
      completedAt: null,
      currentPhase: 'deep_dive',
      phaseStartedAt: new Date(Date.now() - 10 * 60 * 1000),
      companyStyle: 'faang',
      level: 'mid',
    })
    .returning();

  console.log(`Created interview session: ${session.id}`);

  // Create transcript messages (interview conversation)
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
    {
      sessionId: session.id,
      role: 'interviewer',
      text: 'Good. How would you generate the short codes?',
      status: 'completed',
      phase: 'deep_dive',
      secondsElapsed: 420,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "For short code generation, I'd use base62 encoding (alphanumeric characters). We have a few options here with tradeoffs: Option 1 is using an auto-incrementing ID and encoding it to base62 - this is simple and guarantees uniqueness, but it's predictable. Option 2 is using a hash function like MD5 and taking the first N characters - this is unpredictable but could have collisions. Option 3 is generating random strings and checking for collisions. I'd go with Option 1 (auto-increment + base62) for simplicity and guaranteed uniqueness, which gives us 62^7 = 3.5 trillion possible URLs with a 7-character code.",
      status: 'completed',
      phase: 'deep_dive',
      secondsElapsed: 520,
    },
    {
      sessionId: session.id,
      role: 'interviewer',
      text: 'Great analysis of tradeoffs. How would you handle the scale you mentioned earlier?',
      status: 'completed',
      phase: 'deep_dive',
      secondsElapsed: 550,
    },
    {
      sessionId: session.id,
      role: 'candidate',
      text: "For scalability: With 100 million URLs per month, that's about 40 shortening requests per second, and with a 100:1 read ratio, we'd have 4000 redirect requests per second. To handle this scale, we'd horizontally scale the API servers behind a load balancer. The database could be scaled with read replicas for the high read load. Redis caching is crucial here - we'd cache the most frequently accessed URLs, which would handle the majority of traffic. For potential bottlenecks, the database write could become a bottleneck, so we might need to implement database sharding based on short_code ranges if we grow significantly larger.",
      status: 'completed',
      phase: 'deep_dive',
      secondsElapsed: 680,
    },
  ];

  const insertedMessages = await Promise.all(
    messages.map((msg) => db.insert(transcriptMessages).values(msg).returning()),
  );

  console.log(`Created ${insertedMessages.length} transcript messages`);

  // Create interview signals (positive indicators)
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
      signalName: 'mentioned_scale',
      phase: 'deep_dive',
      secondsElapsed: 680,
      triggeredByMessageId: insertedMessages[11][0].id,
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
      signalName: 'addressed_bottlenecks',
      phase: 'deep_dive',
      secondsElapsed: 680,
      triggeredByMessageId: insertedMessages[11][0].id,
    },
    {
      sessionId: session.id,
      signalName: 'discussed_tradeoffs',
      phase: 'deep_dive',
      secondsElapsed: 520,
      triggeredByMessageId: insertedMessages[9][0].id,
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
  console.log(`Created ${signals.length} interview signals`);

  console.log('\nSeeding completed!');
  console.log(
    `Interview session ${session.id} is ready - currently in 'deep_dive' phase.`,
  );
  console.log(
    `You can continue the interview in the UI and then generate feedback when completed.`,
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
