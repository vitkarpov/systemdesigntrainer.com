import { db } from './db';
import { users } from './schema';

async function seedTestUser() {
  console.log('Creating test user...');

  // Check if test user exists
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, 'test@example.com'),
  });

  if (existingUser) {
    console.log('Test user already exists:', existingUser);
    process.exit(0);
  }

  const [user] = await db
    .insert(users)
    .values({
      email: 'test@example.com',
      name: 'Test User',
      subscriptionStatus: 'free',
      interviewsCompleted: 0,
      interviewsRemaining: 5,
    })
    .returning();

  console.log('Created test user:', user);
  process.exit(0);
}

seedTestUser().catch((error) => {
  console.error('Failed to create test user:', error);
  process.exit(1);
});
