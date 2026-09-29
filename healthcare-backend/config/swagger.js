const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Portal API',
      version: '1.0.0',
      description: 'Complete Healthcare Management System API with 46+ endpoints',
      contact: {
        name: 'Healthcare Team',
        email: 'support@healthcare-portal.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.healthcare-portal.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login/signup'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Clinic', description: 'Clinic management' },
      { name: 'Patient', description: 'Patient management and medical records' },
      { name: 'Appointment', description: 'Appointment scheduling' },
      { name: 'Consultation', description: 'Medical consultations and prescriptions' },
      { name: 'Billing', description: 'Invoicing and payments' },
      { name: 'Chatbot', description: 'AI chatbot for patient queries' }
    ]
  },
  apis: ['./routes/*.js', './index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;