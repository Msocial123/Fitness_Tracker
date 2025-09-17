# FitTrack Pro - Professional Fitness Tracker

<div align="center">
  <img src="./public/assets/logo.png" alt="FitTrack Pro Logo" width="120" height="120">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
  [![MongoDB](https://img.shields.io/badge/MongoDB-v5+-green.svg)](https://mongodb.com)
</div>

## 🏋️ Overview

**FitTrack Pro** is a comprehensive fitness tracking web application that helps users monitor their workouts, track health metrics, and achieve their fitness goals. Built with modern web technologies, it offers both client and trainer functionality with a professional, responsive design.

### ✨ Key Features

- **User Management**: Secure registration and authentication system
- **Workout Logging**: Track daily workouts with detailed metrics
- **Health Metrics**: Monitor weight, BMI, and body fat percentage
- **Progress Analytics**: Visualize progress with interactive charts
- **Personal Training**: Trainers can manage clients and create custom workout plans
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Professional UI**: Modern, intuitive interface with smooth animations

## 🚀 Demo

Visit the live application: [FitTrack Pro Demo](https://fittrackpro.herokuapp.com) *(deployment link)*

### Screenshots

| Home Page | Dashboard | Progress Tracking |
|-----------|-----------|-------------------|
| ![Home](./docs/screenshots/home.png) | ![Dashboard](./docs/screenshots/dashboard.png) | ![Progress](./docs/screenshots/progress.png) |

## 🛠️ Technologies Used

### Frontend
- **HTML5** - Semantic markup with accessibility features
- **CSS3** - Modern CSS with custom properties, Grid, and Flexbox
- **JavaScript (ES6+)** - Vanilla JavaScript with modern features
- **Font Awesome** - Professional icons
- **Chart.js** - Interactive progress charts

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Development
- **Nodemon** - Development server with auto-restart
- **ESLint** - Code linting and formatting
- **Git** - Version control

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/fittrack-pro.git
cd fittrack-pro
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
npm run setup
```

### 3. Set Up MongoDB

#### Option A: Local MongoDB Installation

1. **Install MongoDB** following the [official guide](https://docs.mongodb.com/manual/installation/)
2. **Start MongoDB service**:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb/brew/mongodb-community
   
   # Linux (Ubuntu)
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update the connection string in `server/app.js`:
   ```javascript
   mongoose.connect('your-mongodb-atlas-connection-string', {
     useNewUrlParser: true,
     useUnifiedTopology: true
   });
   ```

### 4. Configure Environment Variables (Optional)

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/fitness-tracker

# Security (for production)
JWT_SECRET=your-super-secret-jwt-key
```

### 5. Start the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

## 🐳 Docker Setup (Recommended)

**Docker provides the easiest way to run FitTrack Pro with all dependencies.**

### Prerequisites for Docker

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)
- **Git** (for cloning the repository)

### Quick Start with Docker

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/fittrack-pro.git
   cd fittrack-pro
   ```

2. **Start the application**:
   ```bash
   npm run compose:up
   ```

3. **Access the application**:
   - **Main App**: http://localhost:5000
   - **Database Admin**: http://localhost:8081 (admin/fittrack123)

4. **Stop the application**:
   ```bash
   npm run compose:down
   ```

### Available Docker Scripts

```bash
# Build and start all services
npm run compose:up

# Stop all services
npm run compose:down

# View logs
npm run compose:logs

# Rebuild containers
npm run compose:build

# Restart services
npm run compose:restart

# Clean up (remove containers and volumes)
npm run compose:clean
```

### Docker Services

#### 1. Fitness Tracker App (`fitness-app`)
- **Port**: 5000
- **Technology**: Node.js with Express
- **Health Check**: Built-in endpoint monitoring

#### 2. MongoDB Database (`mongodb`)
- **Port**: 27017
- **Version**: MongoDB 7.0
- **Data Persistence**: Named volume `mongodb_data`
- **Initialization**: Automatic database setup with sample data

#### 3. MongoDB Express (`mongo-express`)
- **Port**: 8081
- **Purpose**: Web-based MongoDB administration
- **Credentials**: admin/fittrack123

### Docker Configuration Files

#### Dockerfile
```dockerfile
# Multi-stage build for production
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --only=production
COPY . .
USER nodejs
EXPOSE 5000
CMD ["npm", "start"]
```

#### docker-compose.yml
- **Orchestrates**: Application, Database, Admin Interface
- **Networks**: Custom bridge network for service communication
- **Volumes**: Persistent data storage for MongoDB
- **Environment**: Production-ready configuration

### Environment Configuration

Docker Compose uses these environment variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/fitness-tracker
PORT=5000
```

### Data Persistence

- **MongoDB Data**: Persisted in named volume `mongodb_data`
- **Application Logs**: Mounted to `./logs` directory
- **Data Survives**: Container restarts and rebuilds

### Development with Docker

For development with hot-reload:

1. **Create docker-compose.dev.yml** (for development overrides)
2. **Run development mode**:
   ```bash
   npm run docker:dev
   ```

### Troubleshooting Docker

#### Common Issues:

1. **Port already in use**:
   ```bash
   # Check what's using port 5000
   netstat -an | findstr :5000
   # Stop conflicting services
   npm run compose:down
   ```

2. **Database connection issues**:
   ```bash
   # Check container logs
   docker logs fitness-tracker-mongodb
   docker logs fitness-tracker-app
   ```

3. **Clean slate restart**:
   ```bash
   # Remove all containers and volumes
   npm run compose:clean
   # Rebuild and start
   npm run compose:build
   npm run compose:up
   ```

4. **Memory issues**:
   - Increase Docker Desktop memory allocation
   - Close unnecessary applications

### Production Docker Deployment

1. **Build production image**:
   ```bash
   docker build -t fitness-tracker:production .
   ```

2. **Run with production compose**:
   ```bash
   npm run docker:prod
   ```

3. **Scale the application**:
   ```bash
   docker-compose up --scale fitness-app=3
   ```

## 📁 Project Structure

```
fittrack-pro/
├── public/                 # Frontend static files
│   ├── assets/            # Images and media files
│   ├── css/               # Stylesheets
│   │   ├── main.css       # Main styles with CSS variables
│   │   └── components.css # Reusable component styles
│   ├── js/                # JavaScript files
│   │   └── app.js         # Main application logic
│   └── pages/             # HTML pages
│       ├── login.html
│       ├── log-workout.html
│       ├── track-metrics.html
│       ├── progress.html
│       └── trainer-panel.html
├── server/                # Backend application
│   ├── routes/           # API route handlers
│   │   └── auth.js       # Authentication and data routes
│   └── app.js            # Express server configuration
├── docs/                 # Documentation and screenshots
├── index.html           # Main homepage
├── package.json         # Root package configuration
└── README.md           # Project documentation
```

## 🎯 Usage Guide

### For Clients

1. **Registration**: Create an account by visiting the homepage
2. **Login**: Sign in with your credentials
3. **Log Workouts**: Record your daily exercises with duration and calories
4. **Track Metrics**: Monitor your weight, BMI, and body fat percentage
5. **View Progress**: Analyze your fitness journey with visual charts

### For Trainers

1. **Registration**: Create an account with "Trainer" role
2. **Client Management**: Access the trainer panel to manage clients
3. **Workout Plans**: Create and assign custom workout plans
4. **Progress Monitoring**: Track client progress and adjust plans accordingly

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Workouts
- `POST /api/auth/log-workout` - Log a new workout
- `GET /api/auth/workouts/:email` - Get user workouts

#### Metrics
- `POST /api/auth/metrics` - Record health metrics
- `GET /api/auth/metrics/:email` - Get user metrics

#### Trainer Plans
- `POST /api/auth/plans` - Create workout plan
- `GET /api/auth/plans/:trainer` - Get trainer's plans
- `PUT /api/auth/plans/:id` - Update plan
- `DELETE /api/auth/plans/:id` - Delete plan

## 🎨 Features Deep Dive

### Professional Design System

- **CSS Custom Properties**: Centralized theme management
- **Typography**: Inter font family for modern readability
- **Color Palette**: Professional purple and teal color scheme
- **Responsive Grid**: Mobile-first approach with CSS Grid and Flexbox
- **Animations**: Smooth transitions and micro-interactions

### User Experience

- **Form Validation**: Real-time client-side validation with error messages
- **Loading States**: Visual feedback during API calls
- **Toast Notifications**: Non-intrusive success and error messages
- **Accessibility**: ARIA labels, keyboard navigation, and semantic HTML

### Data Visualization

- **Progress Charts**: Interactive charts using Chart.js
- **Weekly Analytics**: Workout duration tracking by day
- **Metrics Tracking**: Weight, BMI, and body fat trends

## 🔒 Security Features

- **Input Validation**: Server-side and client-side validation
- **Data Sanitization**: Prevents XSS and injection attacks
- **Secure Headers**: Protection against common vulnerabilities
- **Password Requirements**: Strong password enforcement

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Check for security vulnerabilities
npm audit
```

## 🚀 Deployment

### Heroku Deployment

1. **Create a Heroku app**:
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables**:
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-connection-string
   heroku config:set NODE_ENV=production
   ```

3. **Deploy**:
   ```bash
   git push heroku main
   ```

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 🐛 Known Issues

- [ ] Password reset functionality not implemented
- [ ] Email notifications for workout reminders pending

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Pulkit Srivastava**

## 🙏 Acknowledgments

- [Font Awesome](https://fontawesome.com/) for the amazing icons
- [Chart.js](https://www.chartjs.org/) for the beautiful charts
- [MongoDB](https://www.mongodb.com/) for the robust database
- [Express.js](https://expressjs.com/) for the excellent web framework

---

<div align="center">
  <p>Built with ❤️ by Pulkit Srivastava</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>
