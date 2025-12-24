#!/bin/sh
set -e

echo "Starting application..."

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Check if migrations succeeded
if [ $? -ne 0 ]; then
  echo "ERROR: Database migrations failed!"
  exit 1
fi

echo "Migrations completed successfully"

# Start the application
echo "Starting NestJS application..."
exec node dist/main
