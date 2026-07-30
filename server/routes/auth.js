const express = require('express');
const mongoose = require('mongoose');
const { logger } = require('../datadog');
const { requireAuth, requireRole, requireSelfParam } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../security/passwords');
const { clearAuthCookie, setAuthCookie, signAuthToken } = require('../security/tokens');

const router = express.Router();

// User schema for MongoDB
const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['client', 'trainer'], default: 'client' },
  
  // Client-specific fields
  goal: { type: String, required: function() { return this.role === 'client'; } },
  
  // Trainer-specific fields
  specialization: { type: String, required: function() { return this.role === 'trainer'; } },
  experience: { type: String, required: function() { return this.role === 'trainer'; } },
  certification: { type: String, default: '' } // Optional for trainers
});

const User = mongoose.model('User', userSchema);

// Workout schema for MongoDB
const workoutSchema = new mongoose.Schema({
  email: { type: String, required: true },
  type: { type: String, required: true },
  duration: { type: Number, required: true },
  calories: { type: Number, required: true },
  date: { type: String, required: true },
  notes: { type: String, default: '' }
});

const Workout = mongoose.model('Workout', workoutSchema);

// Metrics schema for MongoDB
const metricsSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: String, required: true },
  weight: { type: Number, required: true },
  bmi: { type: Number, required: true },
  fat: { type: Number, default: 0 }
});

const Metrics = mongoose.model('Metrics', metricsSchema);

// Trainer Plan schema for MongoDB
const planSchema = new mongoose.Schema({
  trainer: { type: String, required: true }, // trainer email
  client: { type: String, required: true },
  plan: { type: String, required: true }
});
const Plan = mongoose.model('Plan', planSchema);

// Register
router.post('/register', async (req, res) => {
  logger.info('User registration attempt', {
    email: req.body.email,
    role: req.body.role,
    action: 'registration_started'
  });
  
  const { fullname, password, role, goal, specialization, experience, certification } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  
  // Basic validation for all users
  if (!fullname || !email || !password || !role) {
    logger.warn('Registration failed - missing required fields', {
      email,
      missingFields: !fullname ? 'fullname' : !email ? 'email' : !password ? 'password' : 'role'
    });
    return res.status(400).json({ msg: 'Full name, email, password, and role are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ msg: 'Password must be at least 8 characters' });
  }
  
  // Role-specific validation
  if (role === 'client' && !goal) {
    logger.warn('Registration failed - client missing goal', { email, role });
    return res.status(400).json({ msg: 'Fitness goal is required for client registration' });
  }
  
  if (role === 'trainer' && (!specialization || !experience)) {
    logger.warn('Registration failed - trainer missing required fields', {
      email,
      role,
      missingSpecialization: !specialization,
      missingExperience: !experience
    });
    return res.status(400).json({ msg: 'Specialization and experience are required for trainer registration' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration failed - user already exists', {
        email,
        action: 'duplicate_user_attempt'
      });
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create user object based on role
    const userData = {
      fullname,
      email,
      password: await hashPassword(password),
      role
    };
    
    // Add role-specific fields
    if (role === 'client') {
      userData.goal = goal;
    } else if (role === 'trainer') {
      userData.specialization = specialization;
      userData.experience = experience;
      userData.certification = certification || '';
    }
    
    const newUser = new User(userData);
    await newUser.save();
    
    logger.info('User registration successful', {
      email: newUser.email,
      role: newUser.role,
      action: 'registration_completed',
      userId: newUser._id.toString()
    });
    
    res.status(201).json({ msg: 'Registered successfully' });
  } catch (err) {
    logger.error('Registration error', {
      email,
      error: err.message,
      action: 'registration_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { password, role } = req.body;
  const email = req.body.email?.trim().toLowerCase();
  
  logger.info('User login attempt', {
    email,
    role,
    action: 'login_started'
  });
  
  if (!email || !password || !role) {
    logger.warn('Login failed - missing required fields', {
      email,
      role,
      missingFields: !email ? 'email' : !password ? 'password' : 'role'
    });
    return res.status(400).json({ msg: 'All fields are required' });
  }

  try {
    const user = await User.findOne({ email, role }).select('+password');
    const passwordResult = user
      ? await verifyPassword(password, user.password)
      : { valid: false, needsUpgrade: false };

    if (!user || !passwordResult.valid) {
      logger.warn('Login failed - invalid credentials', {
        email,
        role,
        action: 'invalid_credentials'
      });
      return res.status(400).json({ msg: 'Invalid credentials or role' });
    }

    if (passwordResult.needsUpgrade) {
      user.password = await hashPassword(password);
      await user.save();
      logger.info('Legacy password hash upgraded', {
        userId: user._id.toString(),
        action: 'password_hash_upgraded'
      });
    }

    setAuthCookie(res, signAuthToken(user));

    // Base response
    const response = {
      success: true,
      fullname: user.fullname,
      email: user.email,
      role: user.role
    };
    
    // Add role-specific fields
    if (user.role === 'client') {
      response.goal = user.goal;
    } else if (user.role === 'trainer') {
      response.specialization = user.specialization;
      response.experience = user.experience;
      response.certification = user.certification;
    }

    logger.info('User login successful', {
      email: user.email,
      role: user.role,
      action: 'login_completed',
      userId: user._id.toString()
    });

    res.json(response);
  } catch (err) {
    logger.error('Login error', {
      email,
      role,
      error: err.message,
      action: 'login_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Log workout
router.post('/log-workout', requireAuth, async (req, res) => {
  const { type, duration, calories, date, notes } = req.body;
  const email = req.user.email;
  
  logger.info('Workout logging attempt', {
    email,
    type,
    duration,
    calories,
    action: 'workout_log_started'
  });
  
  if (!email || !type || !duration || !calories || !date) {
    logger.warn('Workout logging failed - missing fields', {
      email,
      missingFields: { email: !email, type: !type, duration: !duration, calories: !calories, date: !date }
    });
    return res.status(400).json({ msg: 'All required fields are missing' });
  }
  
  try {
    const workout = new Workout({ 
      email, 
      type, 
      duration: parseInt(duration), 
      calories: parseInt(calories), 
      date,
      notes: notes || ''
    });
    
    await workout.save();
    
    logger.info('Workout logged successfully', {
      email,
      type,
      duration: parseInt(duration),
      calories: parseInt(calories),
      action: 'workout_logged',
      workoutId: workout._id.toString()
    });
    
    res.json({ success: true, msg: 'Workout logged' });
  } catch (err) {
    logger.error('Workout logging error', {
      email,
      type,
      error: err.message,
      action: 'workout_log_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get workouts for progress page
router.get('/workouts/:email', requireAuth, requireSelfParam('email'), async (req, res) => {
  logger.info('Fetching workouts', {
    email: req.params.email,
    action: 'workouts_fetch_started'
  });
  
  try {
    const workouts = await Workout.find({ email: req.params.email });
    
    logger.info('Workouts fetched successfully', {
      email: req.params.email,
      workoutsCount: workouts.length,
      action: 'workouts_fetched'
    });
    
    res.json({ success: true, workouts });
  } catch (err) {
    logger.error('Workouts fetch error', {
      email: req.params.email,
      error: err.message,
      action: 'workouts_fetch_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Store metrics
router.post('/metrics', requireAuth, async (req, res) => {
  const { date, weight, bmi, fat } = req.body;
  const email = req.user.email;
  
  logger.info('Metrics storage attempt', {
    email,
    date,
    weight,
    bmi,
    fat: fat || 0,
    action: 'metrics_storage_started'
  });
  
  if (!email || !date || !weight || !bmi) {
    logger.warn('Metrics storage failed - missing fields', {
      email,
      missingFields: { email: !email, date: !date, weight: !weight, bmi: !bmi }
    });
    return res.status(400).json({ msg: 'All required fields must be provided' });
  }
  
  try {
    const metrics = new Metrics({ 
      email, 
      date, 
      weight, 
      bmi, 
      fat: fat || 0 
    });
    
    await metrics.save();
    
    logger.info('Metrics stored successfully', {
      email,
      date,
      weight,
      bmi,
      fat: fat || 0,
      action: 'metrics_stored',
      metricsId: metrics._id.toString()
    });
    
    res.json({ success: true, msg: 'Metrics updated' });
  } catch (err) {
    logger.error('Metrics storage error', {
      email,
      error: err.message,
      action: 'metrics_storage_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get metrics for progress page
router.get('/metrics/:email', requireAuth, requireSelfParam('email'), async (req, res) => {
  logger.info('Fetching metrics', {
    email: req.params.email,
    action: 'metrics_fetch_started'
  });
  
  try {
    const metrics = await Metrics.find({ email: req.params.email });
    
    logger.info('Metrics fetched successfully', {
      email: req.params.email,
      metricsCount: metrics.length,
      action: 'metrics_fetched'
    });
    
    res.json({ success: true, metrics });
  } catch (err) {
    logger.error('Metrics fetch error', {
      email: req.params.email,
      error: err.message,
      action: 'metrics_fetch_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Assign a new plan
router.post('/plans', requireAuth, requireRole('trainer'), async (req, res) => {
  const { client, plan } = req.body;
  const trainer = req.user.email;
  
  logger.info('Plan assignment attempt', {
    trainer,
    client,
    planLength: plan?.length || 0,
    action: 'plan_assignment_started'
  });
  
  if (!trainer || !client || !plan) {
    logger.warn('Plan assignment failed - missing fields', {
      trainer,
      client,
      hasPlan: !!plan,
      action: 'plan_assignment_validation_failed'
    });
    return res.status(400).json({ msg: 'All fields are required' });
  }
  
  try {
    const newPlan = new Plan({ trainer, client, plan });
    await newPlan.save();
    
    logger.info('Plan assigned successfully', {
      trainer,
      client,
      planId: newPlan._id.toString(),
      action: 'plan_assigned'
    });
    
    res.json({ success: true, msg: 'Plan assigned' });
  } catch (err) {
    logger.error('Plan assignment error', {
      trainer,
      client,
      error: err.message,
      action: 'plan_assignment_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all plans assigned by a trainer
router.get('/plans/:trainer', requireAuth, requireRole('trainer'), requireSelfParam('trainer'), async (req, res) => {
  logger.info('Fetching trainer plans', {
    trainer: req.params.trainer,
    action: 'trainer_plans_fetch_started'
  });
  
  try {
    const plans = await Plan.find({ trainer: req.params.trainer });
    
    logger.info('Trainer plans fetched successfully', {
      trainer: req.params.trainer,
      plansCount: plans.length,
      action: 'trainer_plans_fetched'
    });
    
    res.json({ success: true, plans });
  } catch (err) {
    logger.error('Trainer plans fetch error', {
      trainer: req.params.trainer,
      error: err.message,
      action: 'trainer_plans_fetch_failed'
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Edit a plan
router.put('/plans/:id', requireAuth, requireRole('trainer'), async (req, res) => {
  const { client, plan } = req.body;
  try {
    const updatedPlan = await Plan.findOneAndUpdate(
      { _id: req.params.id, trainer: req.user.email },
      { client, plan },
      { new: true, runValidators: true }
    );
    if (!updatedPlan) {
      return res.status(404).json({ msg: 'Plan not found' });
    }
    res.json({ success: true, msg: 'Plan updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a plan
router.delete('/plans/:id', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const deletedPlan = await Plan.findOneAndDelete({
      _id: req.params.id,
      trainer: req.user.email
    });
    if (!deletedPlan) {
      return res.status(404).json({ msg: 'Plan not found' });
    }
    res.json({ success: true, msg: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Test endpoint to verify server connectivity
router.post('/test', requireAuth, (req, res) => {
  logger.info('Test endpoint accessed', {
    action: 'test_endpoint_hit'
  });
  res.json({ success: true, msg: 'Test endpoint working', receivedData: req.body });
});

// Logout (for localStorage-based auth, this is client-side)
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ msg: 'Logged out successfully' });
});

module.exports = router;
