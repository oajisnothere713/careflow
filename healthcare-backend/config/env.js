require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-portal',
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

// Warn on missing critical vars
if (!config.email.user) console.warn('⚠️  EMAIL_USER not set, email features disabled');
if (!config.email.password) console.warn('⚠️  EMAIL_PASSWORD not set, email features disabled');

module.exports = config;
