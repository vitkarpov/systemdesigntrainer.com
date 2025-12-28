import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from './db';
import {
  interviewCases,
  interviewCaseExpectations,
  interviewCaseTags,
} from './schema';

/**
 * Seeds interview cases - safe to run in production
 * This only creates interview cases and does not delete any existing data
 */
export async function seedInterviewCasesWithDb(database: NodePgDatabase<any>) {
  console.log('Seeding interview cases...');

  const cases = [
    {
      title: 'Design a URL Shortener',
      slug: 'url-shortener',
      description:
        'Design a scalable URL shortening service like bit.ly or TinyURL',
      difficulty: 'medium',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (URL generation, redirection, analytics)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Clarify non-functional requirements (latency, scale, availability)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Define REST API endpoints (POST /shorten, GET /{shortCode})',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description: 'Design database schema for URL mappings',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose component architecture (API servers, database, cache)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain short code generation strategy (base62 encoding, hashing)',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description: 'Design caching strategy (Redis for hot URLs)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description: 'Discuss horizontal scaling of API servers',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description: 'Address database partitioning/sharding strategy',
          displayOrder: 9,
        },
      ],
      tags: ['web-services', 'scalability', 'caching', 'databases', 'api-design'],
    },
    {
      title: 'Design a News Feed System',
      slug: 'news-feed',
      description:
        'Design a news feed system like Facebook, Twitter, or Instagram',
      difficulty: 'hard',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (post creation, feed generation, following)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define scale requirements (users, posts per day, feed refresh)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design API endpoints (POST /posts, GET /feed, POST /follow)',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design schema for users, posts, follows, and feed relationships',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (API layer, feed generation service, storage)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain feed generation approaches (fan-out on write vs read)',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design ranking algorithm for feed (chronological vs engagement-based)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description: 'Handle celebrity/influencer problem (millions of followers)',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss caching strategy and database partitioning for feeds',
          displayOrder: 9,
        },
      ],
      tags: ['social-media', 'scalability', 'databases', 'caching', 'real-time'],
    },
    {
      title: 'Design a Rate Limiter',
      slug: 'rate-limiter',
      description:
        'Design a distributed rate limiting system to prevent API abuse',
      difficulty: 'medium',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify requirements (rate limit rules, scope, throttling behavior)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define scale and latency requirements (requests per second, overhead)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design rate limiter interface (allowRequest, configuration)',
          displayOrder: 3,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (rate limiter placement, storage layer)',
          displayOrder: 4,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain rate limiting algorithms (token bucket, leaky bucket, sliding window)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design distributed rate limiting with Redis (atomic operations)',
          displayOrder: 6,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle distributed system challenges (race conditions, clock skew)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss performance optimization (local caching, batching)',
          displayOrder: 8,
        },
      ],
      tags: ['security', 'distributed-systems', 'caching', 'algorithms'],
    },
    {
      title: 'Design a Video Streaming Platform',
      slug: 'video-streaming',
      description:
        'Design a video streaming service like YouTube or Netflix',
      difficulty: 'hard',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (upload, streaming, search, recommendations)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define scale requirements (concurrent viewers, video uploads, storage)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design API endpoints (POST /videos, GET /stream/{id}, GET /search)',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design schema for videos, users, metadata, and view history',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (upload service, transcoding, CDN, streaming)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain video transcoding pipeline (formats, resolutions, codecs)',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design CDN strategy and adaptive bitrate streaming (HLS, DASH)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle storage scaling (blob storage, hot vs cold storage)',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss content delivery optimization (edge caching, geo-routing)',
          displayOrder: 9,
        },
      ],
      tags: ['media', 'scalability', 'cdn', 'storage', 'streaming'],
    },
    {
      title: 'Design a Chat System',
      slug: 'chat-system',
      description:
        'Design a real-time chat application like WhatsApp, Slack, or Discord',
      difficulty: 'hard',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (1-on-1 chat, group chat, typing indicators)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define non-functional requirements (latency, message delivery, storage)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design API for sending messages, presence, and message history',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design schema for users, conversations, messages, and read receipts',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (WebSocket servers, message queue, storage)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain real-time communication protocol (WebSockets vs long polling)',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design message delivery guarantees (at-least-once, ordering)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle connection management at scale (connection servers, load balancing)',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss message persistence and history retrieval optimization',
          displayOrder: 9,
        },
      ],
      tags: ['real-time', 'websockets', 'messaging', 'scalability', 'distributed-systems'],
    },
    {
      title: 'Design a Distributed Cache',
      slug: 'distributed-cache',
      description:
        'Design a distributed caching system like Memcached or Redis',
      difficulty: 'hard',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (get, set, delete, TTL)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define non-functional requirements (latency, throughput, availability)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design cache interface (get, set, delete, eviction policies)',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design in-memory data structures (hash maps, LRU list)',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose distributed architecture (cache nodes, consistent hashing)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain eviction policies (LRU, LFU, TTL-based)',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design consistent hashing for data distribution and node addition/removal',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle replication and consistency (eventual vs strong consistency)',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss failure handling (node failures, data recovery)',
          displayOrder: 9,
        },
      ],
      tags: ['caching', 'distributed-systems', 'data-structures', 'scalability'],
    },
    {
      title: 'Design a Search Autocomplete System',
      slug: 'search-autocomplete',
      description:
        'Design a typeahead/autocomplete system like Google Search',
      difficulty: 'medium',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (prefix matching, ranking, personalization)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define performance requirements (latency, scale, update frequency)',
          displayOrder: 2,
        },
        {
          expectationType: 'api',
          description:
            'Design API endpoints (GET /autocomplete?q={prefix})',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design data structures for storing and querying suggestions',
          displayOrder: 4,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (API servers, data aggregation, storage)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain trie data structure for efficient prefix matching',
          displayOrder: 6,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design ranking algorithm (popularity, recency, personalization)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle scale with caching and pre-computation strategies',
          displayOrder: 8,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss data update pipeline (trending terms, analytics)',
          displayOrder: 9,
        },
      ],
      tags: ['search', 'data-structures', 'caching', 'algorithms'],
    },
    {
      title: 'Design a Web Crawler',
      slug: 'web-crawler',
      description:
        'Design a distributed web crawler for a search engine',
      difficulty: 'medium',
      problemStatement: '',
      estimatedDuration: 45,
      isActive: true,
      expectations: [
        {
          expectationType: 'requirements',
          description:
            'Clarify functional requirements (URL discovery, content extraction, politeness)',
          displayOrder: 1,
        },
        {
          expectationType: 'requirements',
          description:
            'Define scale requirements (pages per second, freshness, storage)',
          displayOrder: 2,
        },
        {
          expectationType: 'high_level',
          description:
            'Propose architecture (URL frontier, fetcher, parser, storage)',
          displayOrder: 3,
        },
        {
          expectationType: 'data_model',
          description:
            'Design data structures for URL queue and visited URLs',
          displayOrder: 4,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Explain URL frontier design (priority queue, politeness constraints)',
          displayOrder: 5,
        },
        {
          expectationType: 'deep_dive',
          description:
            'Design duplicate detection system (bloom filters, URL normalization)',
          displayOrder: 6,
        },
        {
          expectationType: 'scalability',
          description:
            'Handle distributed crawling (coordinator, worker nodes, load balancing)',
          displayOrder: 7,
        },
        {
          expectationType: 'scalability',
          description:
            'Discuss robots.txt compliance and rate limiting per domain',
          displayOrder: 8,
        },
      ],
      tags: ['distributed-systems', 'scalability', 'web-services', 'algorithms'],
    },
  ];

  for (const caseData of cases) {
    // Check if case already exists
    const existingCase = await database
      .select()
      .from(interviewCases)
      .where(eq(interviewCases.slug, caseData.slug))
      .limit(1);

    if (existingCase.length > 0) {
      console.log(`  Case "${caseData.title}" already exists, skipping...`);
      continue;
    }

    // Create the case
    const [createdCase] = await database
      .insert(interviewCases)
      .values({
        title: caseData.title,
        slug: caseData.slug,
        description: caseData.description,
        difficulty: caseData.difficulty,
        problemStatement: caseData.problemStatement,
        estimatedDuration: caseData.estimatedDuration,
        isActive: caseData.isActive,
      })
      .returning();

    console.log(`  ✓ Created case: ${createdCase.title}`);

    // Add expectations
    const expectations = caseData.expectations.map((exp) => ({
      caseId: createdCase.id,
      expectationType: exp.expectationType,
      description: exp.description,
      displayOrder: exp.displayOrder,
    }));

    await database.insert(interviewCaseExpectations).values(expectations);
    console.log(`    Added ${expectations.length} expectations`);

    // Add tags
    const tags = caseData.tags.map((tag) => ({
      caseId: createdCase.id,
      tag,
    }));

    await database.insert(interviewCaseTags).values(tags);
    console.log(`    Added ${tags.length} tags`);
  }

  console.log('\n✅ Interview cases seeding completed!');
}

// Standalone execution
async function seedInterviewCases() {
  try {
    await seedInterviewCasesWithDb(db);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  seedInterviewCases();
}
