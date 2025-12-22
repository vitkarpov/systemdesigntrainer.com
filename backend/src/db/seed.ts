import { db } from './db';
import {
  users,
  interviewCases,
  interviewCaseExpectations,
  interviewCaseTags,
} from './schema';

async function seed() {
  console.log('Cleaning up database...');

  // Delete existing data in correct order (respecting foreign key constraints)
  await db.delete(interviewCaseTags);
  await db.delete(interviewCaseExpectations);
  await db.delete(interviewCases);
  await db.delete(users);

  console.log('Database cleaned. Seeding database...');

  // Create test user for development
  const [testUser] = await db
    .insert(users)
    .values({
      workosUserId: 'test_user_dev',
      email: 'test@example.com',
      name: 'Test User',
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
      problemStatement: `Design a URL shortening service that allows users to:
- Submit long URLs and receive short, unique codes
- Redirect users from short URLs to the original long URLs
- Track basic analytics (click counts)

You can discuss any relevant system design aspects as you see fit.`,
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

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
