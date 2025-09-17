// MongoDB initialization script for Fitness Tracker
// This script runs when the MongoDB container starts for the first time

// Switch to fitness-tracker database
db = db.getSiblingDB('fitness-tracker');

// Create collections with validation schemas
print('🏋️  Initializing Fitness Tracker Database...');

// Users collection with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fullname', 'email', 'password', 'role'],
      properties: {
        fullname: {
          bsonType: 'string',
          description: 'Full name is required and must be a string'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Valid email address is required'
        },
        password: {
          bsonType: 'string',
          minLength: 6,
          description: 'Password must be at least 6 characters'
        },
        role: {
          enum: ['client', 'trainer'],
          description: 'Role must be either client or trainer'
        },
        goal: {
          bsonType: 'string',
          description: 'Fitness goal for clients'
        },
        specialization: {
          bsonType: 'string',
          description: 'Specialization for trainers'
        },
        experience: {
          bsonType: 'string',
          description: 'Experience level for trainers'
        },
        certification: {
          bsonType: 'string',
          description: 'Certification for trainers'
        }
      }
    }
  }
});

// Workouts collection with validation
db.createCollection('workouts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'type', 'duration', 'calories', 'date'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'User email is required'
        },
        type: {
          bsonType: 'string',
          description: 'Workout type is required'
        },
        duration: {
          bsonType: 'number',
          minimum: 1,
          description: 'Duration must be a positive number'
        },
        calories: {
          bsonType: 'number',
          minimum: 0,
          description: 'Calories must be a non-negative number'
        },
        date: {
          bsonType: 'string',
          description: 'Date is required'
        },
        notes: {
          bsonType: 'string',
          description: 'Optional workout notes'
        }
      }
    }
  }
});

// Metrics collection with validation
db.createCollection('metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'date', 'weight', 'bmi'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'User email is required'
        },
        date: {
          bsonType: 'string',
          description: 'Date is required'
        },
        weight: {
          bsonType: 'number',
          minimum: 0,
          description: 'Weight must be a positive number'
        },
        bmi: {
          bsonType: 'number',
          minimum: 0,
          description: 'BMI must be a positive number'
        },
        fat: {
          bsonType: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Body fat percentage between 0-100'
        }
      }
    }
  }
});

// Plans collection with validation
db.createCollection('plans', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['trainer', 'client', 'plan'],
      properties: {
        trainer: {
          bsonType: 'string',
          description: 'Trainer email is required'
        },
        client: {
          bsonType: 'string',
          description: 'Client email is required'
        },
        plan: {
          bsonType: 'string',
          description: 'Plan description is required'
        }
      }
    }
  }
});

// Create indexes for better performance
print('📊 Creating database indexes...');

// Users indexes
db.users.createIndex({ 'email': 1 }, { unique: true, name: 'email_unique_idx' });
db.users.createIndex({ 'role': 1 }, { name: 'role_idx' });

// Workouts indexes
db.workouts.createIndex({ 'email': 1 }, { name: 'workout_email_idx' });
db.workouts.createIndex({ 'date': 1 }, { name: 'workout_date_idx' });
db.workouts.createIndex({ 'email': 1, 'date': -1 }, { name: 'workout_email_date_idx' });

// Metrics indexes
db.metrics.createIndex({ 'email': 1 }, { name: 'metrics_email_idx' });
db.metrics.createIndex({ 'date': 1 }, { name: 'metrics_date_idx' });
db.metrics.createIndex({ 'email': 1, 'date': -1 }, { name: 'metrics_email_date_idx' });

// Plans indexes
db.plans.createIndex({ 'trainer': 1 }, { name: 'plans_trainer_idx' });
db.plans.createIndex({ 'client': 1 }, { name: 'plans_client_idx' });
db.plans.createIndex({ 'trainer': 1, 'client': 1 }, { name: 'plans_trainer_client_idx' });

// Insert sample data for testing (optional)
print('🎯 Inserting sample data...');

// Sample trainer user
db.users.insertOne({
  fullname: 'John Trainer',
  email: 'john.trainer@fittrack.com',
  password: 'trainer123',
  role: 'trainer',
  specialization: 'Weight Training',
  experience: 'Intermediate',
  certification: 'NASM-CPT'
});

// Sample client user
db.users.insertOne({
  fullname: 'Jane Client',
  email: 'jane.client@fittrack.com',
  password: 'client123',
  role: 'client',
  goal: 'Weight Loss'
});

print('✅ Fitness Tracker database initialized successfully!');
print('📋 Collections created: users, workouts, metrics, plans');
print('🔍 Indexes created for optimal performance');
print('👥 Sample users created:');
print('   - Trainer: john.trainer@fittrack.com / trainer123');
print('   - Client: jane.client@fittrack.com / client123');
print('🎉 Database ready for use!');
