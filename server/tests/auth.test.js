const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'testsecret';
  process.env.SMTP_HOST = 'smtp.test';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASS = 'pass';
  process.env.SMTP_FROM = 'no-reply@test.com';
  app = require('../index');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth signup and login', () => {
  test('signup creates user and allows immediate login', async () => {
    // Signup should succeed and not require OTP verification
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'john', email: 'john@example.com', password: 'secret123' })
      .expect(201);
    expect(res.body.requiresVerification).toBe(false);

    // Login should succeed immediately after signup
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'secret123' })
      .expect(200);
    expect(loginRes.body.token).toBeTruthy();
  });
});




