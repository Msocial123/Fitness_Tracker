# 🐳 Docker Setup Guide for FitTrack Pro

This guide will help you get FitTrack Pro running with Docker in minutes!

## 🚀 Quick Start

### Step 1: Install Docker Desktop

1. **Download Docker Desktop** for your operating system:
   - **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - **Linux**: [Docker Engine for Linux](https://docs.docker.com/engine/install/)

2. **Install and Start Docker Desktop**
   - Follow the installation instructions for your OS
   - Start Docker Desktop and wait for it to be ready (green icon in system tray)

### Step 2: Clone and Run

```bash
# Clone the repository
git clone https://github.com/yourusername/fittrack-pro.git
cd fittrack-pro

# Start the application with one command
npm run compose:up
```

### Step 3: Access the Application

Once containers are running:

- **🏋️ Main Application**: http://localhost:5000
- **🗄️ Database Admin**: http://localhost:8081 (admin/fittrack123)

## 📋 Available Commands

```bash
# Start all services (detached mode)
npm run compose:up

# Stop all services
npm run compose:down

# View real-time logs
npm run compose:logs

# Rebuild containers after code changes
npm run compose:build

# Clean restart (removes all data)
npm run compose:clean
```

## 🔧 Development Mode

For development with hot-reload and debugging:

```bash
# Start in development mode
npm run docker:dev
```

This enables:
- Hot-reload for code changes
- Node.js debugger on port 9229
- Development environment variables
- Detailed logging

## 📊 What's Running?

### Container Services

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| **fitness-app** | `fitness-tracker-app` | 5000 | Main Node.js application |
| **mongodb** | `fitness-tracker-mongodb` | 27017 | Database server |
| **mongo-express** | `fitness-tracker-mongo-express` | 8081 | Database admin UI |

### Sample Data

The database is automatically initialized with:
- **Trainer**: john.trainer@fittrack.com / trainer123
- **Client**: jane.client@fittrack.com / client123

## 🔍 Troubleshooting

### Problem: Docker Desktop Not Running

**Symptoms:**
```
error during connect: Get "http://...": The system cannot find the file specified.
```

**Solution:**
1. Start Docker Desktop from Start Menu (Windows) or Applications (Mac)
2. Wait for Docker to show "Running" status
3. Retry: `npm run compose:up`

### Problem: Port Already in Use

**Symptoms:**
```
bind: address already in use
```

**Solutions:**

#### Option 1: Stop conflicting services
```bash
# Stop any existing containers
npm run compose:down

# Check what's using the port
netstat -an | findstr :5000  # Windows
lsof -i :5000                # Mac/Linux
```

#### Option 2: Change ports
Edit `docker-compose.yml` and change port mappings:
```yaml
ports:
  - "5001:5000"  # Use port 5001 instead
```

### Problem: Database Connection Failed

**Symptoms:**
- App starts but can't connect to database
- Error: "MongoDB connection error"

**Solutions:**
1. Check MongoDB container status:
   ```bash
   docker logs fitness-tracker-mongodb
   ```

2. Restart services:
   ```bash
   npm run compose:restart
   ```

3. Clean restart (nuclear option):
   ```bash
   npm run compose:clean
   npm run compose:up
   ```

### Problem: Build Failed

**Symptoms:**
```
failed to solve: failed to read dockerfile
```

**Solutions:**
1. Ensure you're in the project root directory
2. Check Dockerfile exists and is readable
3. Try building manually:
   ```bash
   docker build -t fitness-tracker .
   ```

### Problem: Slow Performance

**Solutions:**
1. **Allocate more resources to Docker:**
   - Open Docker Desktop Settings
   - Go to Resources
   - Increase Memory to 4GB+
   - Increase CPU cores to 2+

2. **Clean up Docker:**
   ```bash
   # Remove unused containers and images
   docker system prune -a
   
   # Remove volumes (will delete data!)
   docker volume prune
   ```

### Problem: Permission Denied (Linux)

**Solution:**
Add your user to the docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

## 🏥 Health Checks

### Check Container Status
```bash
# View all containers
docker ps

# Check specific container
docker logs fitness-tracker-app
docker logs fitness-tracker-mongodb
```

### Test Application
```bash
# Test API endpoint
curl http://localhost:5000/api/auth/test

# Test database connection
curl http://localhost:8081
```

## 🔄 Updates and Maintenance

### Update Application Code
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
npm run compose:build
npm run compose:up
```

### Backup Database
```bash
# Create backup
docker exec fitness-tracker-mongodb mongodump --db fitness-tracker --out /data/backup

# Copy backup to host
docker cp fitness-tracker-mongodb:/data/backup ./mongodb-backup
```

### Reset Everything
```bash
# Nuclear option - removes all data
npm run compose:clean
npm run compose:up
```

## 📱 Production Deployment

For production deployment:

```bash
# Build production containers
docker build -t fitness-tracker:prod .

# Run with production settings
npm run docker:prod

# Or deploy to cloud (example with Docker Hub)
docker tag fitness-tracker:prod yourusername/fitness-tracker:latest
docker push yourusername/fitness-tracker:latest
```

## 🆘 Getting Help

If you're still having issues:

1. **Check Docker Desktop is running** (green whale icon)
2. **Try the nuclear option**: `npm run compose:clean && npm run compose:up`
3. **Check system requirements**:
   - 4GB+ RAM available
   - 10GB+ disk space
   - Updated Docker Desktop version
4. **Create an issue** with your error logs

## 🎯 Next Steps

Once running successfully:
1. Visit http://localhost:5000
2. Register a new account or use sample credentials
3. Explore the fitness tracking features
4. Check out the database admin at http://localhost:8081

Happy coding! 🏋️‍♂️
