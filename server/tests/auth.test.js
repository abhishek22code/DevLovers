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

describe('Auth signup and verify OTP', () => {
  test('signup returns requiresVerification and creates user with OTP', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'john', email: 'john@example.com', password: 'secret123' })
      .expect(201);
    expect(res.body.requiresVerification).toBe(true);
  });

  test('login blocked until verification', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'secret123' })
      .expect(403);
  });

  test('verify-otp marks user verified', async () => {
    const User = require('../models/User');
    const user = await User.findOne({ email: 'john@example.com' });
    expect(user).toBeTruthy();
    const code = user.emailVerificationCode;
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'john@example.com', code })
      .expect(200);
  });

  test('login succeeds after verification', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'secret123' })
      .expect(200);
    expect(res.body.token).toBeTruthy();
  });
});




