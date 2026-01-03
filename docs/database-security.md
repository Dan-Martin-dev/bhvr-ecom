# 🔒 Database Security Guide

## 📊 **Current Database Setup**

### **What You Have:**

```yaml
# Docker PostgreSQL Container
Service: postgres:16-alpine
Database: bhvr_ecom
User: postgres
Port: 127.0.0.1:5432 (localhost only)
Password: Stored in POSTGRES_PASSWORD env var
```

### **How It Works:**

1. **Docker Volume:** Data persists in `postgres_data` volume (survives container restarts)
2. **Initialization:** Runs `init.sql` on first startup to create functions
3. **Health Checks:** Ensures database is ready before apps start
4. **Network Isolation:** Only containers in `bhvr-network` can connect

---

## ✅ **What's Safe (After Security Update)**

### **1. No Hardcoded Passwords ✅**
```yaml
# docker-compose.yml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Must be set, no default
```

If you forget to set `POSTGRES_PASSWORD`, Docker will fail instead of using weak default.

### **2. Localhost Binding ✅**
```yaml
ports:
  - "127.0.0.1:5432:5432"  # Only accessible from your computer
```

**Before:** `5432:5432` (exposed to network)  
**After:** `127.0.0.1:5432:5432` (localhost only)

### **3. Separate Databases ✅**
```
bhvr_ecom      # Your app data (safe)
postgres       # Default database (unused, empty)
```

### **4. Volume Persistence ✅**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

Your data survives:
- Container restarts
- Docker Compose down/up
- System reboots

---

## ⚠️ **Development vs Production**

### **Development (Current Setup)**

```bash
# .env (local development)
POSTGRES_PASSWORD=dev_password_change_in_prod_2026
DATABASE_URL=postgresql://postgres:dev_password_change_in_prod_2026@localhost:5432/bhvr_ecom
```

**Safe for development because:**
- ✅ Database only accessible on your computer
- ✅ Not exposed to internet
- ✅ Password is in `.env` (ignored by git)
- ⚠️  Still better than "postgres" or "password"

### **Production (What to Change)**

**NEVER use development passwords in production!**

```bash
# Production environment variables (set in hosting platform)
POSTGRES_PASSWORD=<generate-strong-random-password-here>
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db-host:5432/bhvr_ecom

# Or use managed database (recommended)
DATABASE_URL=<url-from-supabase-neon-render-etc>
```

---

## 🎯 **Security Checklist**

### **For Development (Your Current Setup)**

- ✅ Use unique password (not "postgres", "password", "123456")
- ✅ Bind to localhost only (`127.0.0.1:5432`)
- ✅ Keep `.env` out of git (already in `.gitignore`)
- ✅ Use separate database (`bhvr_ecom`, not `postgres`)
- ⚠️  Don't share your `.env` file
- ⚠️  Don't commit actual passwords

### **For Production**

- 🚨 **MUST** use strong random passwords (32+ characters)
- 🚨 **MUST** use environment variables from hosting platform
- 🚨 **MUST** enable SSL/TLS for database connections
- 🚨 **MUST** use managed database service (Supabase, Neon, Railway, Render)
- 🚨 **MUST** restrict database access by IP
- 🚨 **MUST** enable database backups
- 🚨 **MUST** rotate passwords regularly

---

## 🔧 **How to Use It**

### **1. First Time Setup**

```bash
# Make sure POSTGRES_PASSWORD is set
export POSTGRES_PASSWORD=dev_password_change_in_prod_2026

# Start database
docker-compose up -d postgres

# Apply schema
bun run db:migrate

# Seed data (optional)
bun run db:seed
```

### **2. Daily Development**

```bash
# Start everything
make docker-up

# Check database is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d bhvr_ecom
```

### **3. Reset Database (Nuclear Option)**

```bash
# WARNING: Deletes all data!
docker-compose down -v  # -v deletes volumes
docker-compose up -d postgres
bun run db:migrate
bun run db:seed
```

---

## 🛡️ **Understanding the Risks**

### **Low Risk (Development)**

**Scenario:** Someone on your local network finds your database port.

**Impact:**
- They need to know: IP, port (5432), username (postgres), password
- With `127.0.0.1:5432`, they can't access it (localhost only)
- Your firewall blocks external access
- Development data is not sensitive

**Verdict:** ✅ Safe for development

### **High Risk (Production)**

**Scenario:** Weak password + exposed database port in production.

**Impact:**
- Attackers scan for open PostgreSQL ports (5432)
- Try default credentials (postgres/postgres)
- Access all customer data
- Delete/ransom database

**Verdict:** 🚨 CRITICAL - Never use weak passwords in production

---

## 📝 **Database Credentials Reference**

### **Where They're Used**

| Location | Purpose | Value |
|----------|---------|-------|
| `apps/server/.env` | App connects to DB | `DATABASE_URL` with password |
| `docker-compose.yml` | Postgres container | `POSTGRES_PASSWORD` env var |
| `packages/core/.env.test` | Test suite | Test database URL |

### **How to Change Password**

1. **Update `.env` file:**
   ```bash
   POSTGRES_PASSWORD=new_strong_password_here
   DATABASE_URL=postgresql://postgres:new_strong_password_here@localhost:5432/bhvr_ecom
   ```

2. **Restart containers:**
   ```bash
   docker-compose down
   docker-compose up -d postgres
   ```

3. **Test connection:**
   ```bash
   bun run db:push
   ```

---

## 🎓 **Best Practices**

### **DO:**
- ✅ Use password managers to generate strong passwords
- ✅ Use different passwords for dev/staging/production
- ✅ Use managed database services in production (Supabase, Neon, etc.)
- ✅ Enable database backups
- ✅ Monitor database logs for suspicious activity
- ✅ Use SSL/TLS connections in production
- ✅ Restrict database access by IP whitelist

### **DON'T:**
- ❌ Use "postgres", "password", "admin" as passwords
- ❌ Commit `.env` files to git
- ❌ Share database credentials in chat/email
- ❌ Use same password for multiple environments
- ❌ Expose database port to internet (`0.0.0.0:5432`)
- ❌ Disable SSL in production
- ❌ Use root/postgres user in application code (create separate app user)

---

## 🚀 **Recommended Production Setup**

### **Option 1: Managed Database (Easiest)**

Use a PostgreSQL hosting service:

**Free Tiers:**
- [Supabase](https://supabase.com) - 500MB free, PostgreSQL 15
- [Neon](https://neon.tech) - 512MB free, serverless PostgreSQL
- [Railway](https://railway.app) - $5/month, includes PostgreSQL
- [Render](https://render.com) - Free PostgreSQL with 90-day limit

**Setup:**
```bash
# 1. Create database on platform
# 2. Copy connection string
# 3. Set environment variable in production
DATABASE_URL=postgresql://user:pass@host.db.provider.com:5432/dbname?sslmode=require
```

### **Option 2: Self-Hosted (Advanced)**

If you deploy your own PostgreSQL:

```yaml
# production-docker-compose.yml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_PASSWORD_FILE: /run/secrets/db_password  # Use Docker secrets
    POSTGRES_DB: bhvr_ecom
  ports:
    - "127.0.0.1:5432:5432"  # localhost only
  volumes:
    - postgres_data:/var/lib/postgresql/data
  secrets:
    - db_password
  # Add SSL/TLS configuration
  command: >
    postgres
    -c ssl=on
    -c ssl_cert_file=/etc/ssl/certs/server.crt
    -c ssl_key_file=/etc/ssl/private/server.key

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 🔍 **Verify Your Setup**

Run this checklist:

```bash
# 1. Check password is set
grep POSTGRES_PASSWORD apps/server/.env

# 2. Check port binding
docker-compose config | grep "5432"
# Should show: "127.0.0.1:5432:5432"

# 3. Check database name
docker-compose exec postgres psql -U postgres -l
# Should show: bhvr_ecom database exists

# 4. Test connection
bun run db:push
# Should succeed

# 5. Check .gitignore
git check-ignore apps/server/.env
# Should output: apps/server/.env (file is ignored)
```

All checks pass? ✅ You're good to go for development!

---

## 📚 **Additional Resources**

- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [OWASP Database Security Guide](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)
- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Drizzle ORM Connection Pooling](https://orm.drizzle.team/docs/performance)

---

**Updated:** January 3, 2026  
**Security Level:** ✅ Development-Safe / ⚠️ Production-Ready with Changes
