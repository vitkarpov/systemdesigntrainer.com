# Docker Setup Guide

## Services

- **PostgreSQL**: Database server (port 5432)
- **pgAdmin**: Database management UI (port 5050) - optional

## Quick Start

### Start PostgreSQL
```bash
docker-compose up -d postgres
```

### Start all services (including pgAdmin)
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes all data!)
```bash
docker-compose down -v
```

## Accessing PostgreSQL

### Via Command Line
```bash
# Using psql from host
PGPASSWORD=postgres psql -h localhost -U postgres -d sd_sim_dev

# Or exec into the container
docker exec -it sd-sim-postgres psql -U postgres -d sd_sim_dev
```

### Via pgAdmin (Web UI)
1. Start pgAdmin: `docker-compose up -d pgadmin`
2. Open browser: http://localhost:5050
3. Login with:
   - Email: `admin@example.com`
   - Password: `admin`
4. Add server connection:
   - Host: `postgres` (use service name, not localhost)
   - Port: `5432`
   - Database: `sd_sim_dev`
   - Username: `postgres`
   - Password: `postgres`

## Connection Details

**From your application (backend):**
```
Host: localhost
Port: 5432
Database: sd_sim_dev
Username: postgres
Password: postgres
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/sd_sim_dev
```

## Useful Commands

### View logs
```bash
# All services
docker-compose logs -f

# Just PostgreSQL
docker-compose logs -f postgres
```

### Restart services
```bash
docker-compose restart postgres
```

### Check service status
```bash
docker-compose ps
```

### Execute SQL file
```bash
docker exec -i sd-sim-postgres psql -U postgres -d sd_sim_dev < ./path/to/file.sql
```

### Backup database
```bash
docker exec sd-sim-postgres pg_dump -U postgres sd_sim_dev > backup.sql
```

### Restore database
```bash
docker exec -i sd-sim-postgres psql -U postgres -d sd_sim_dev < backup.sql
```

## Environment Variables

Edit `.env` file to change:
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `DB_PORT`: Exposed port (default: 5432)

## Volumes

Data is persisted in Docker volumes:
- `sd-sim-2_postgres_data`: PostgreSQL data
- `sd-sim-2_pgadmin_data`: pgAdmin settings

To see volumes:
```bash
docker volume ls | grep sd-sim
```

## Troubleshooting

### Port already in use
If port 5432 is already taken:
1. Edit `docker-compose.yml`
2. Change `"5432:5432"` to `"5433:5432"` (or any free port)
3. Update `DB_PORT` in `.env`

### Reset database completely
```bash
docker-compose down -v
docker-compose up -d postgres
```

### Can't connect from host
Make sure:
1. Container is running: `docker-compose ps`
2. Port is exposed: check `docker-compose.yml`
3. No firewall blocking port 5432

### Container keeps restarting
Check logs: `docker-compose logs postgres`

## Next Steps

1. ✅ PostgreSQL is running
2. Choose ORM (Prisma or TypeORM)
3. Create database migrations
4. Seed initial data
5. Connect backend application
