const assert = require('node:assert/strict');
const test = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.JWT_ISSUER = 'fitness-tracker-test';
process.env.JWT_AUDIENCE = 'fitness-tracker-test-client';

const { requireAuth, requireRole, requireSelfParam } = require('../middleware/auth');
const { parseSecret } = require('../config/runtime-secrets');
const { parseMongoSecret, redactMongoUri } = require('../db/mongo');
const { hashPassword, isPasswordHash, verifyPassword } = require('../security/passwords');
const {
  AUTH_COOKIE_NAME,
  signAuthToken,
  verifyAuthToken
} = require('../security/tokens');

const createResponse = () => ({
  statusCode: 200,
  payload: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  }
});

test('passwords are hashed and verified without retaining plaintext', async () => {
  const password = 'ValidPassword123';
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(isPasswordHash(hash), true);
  assert.deepEqual(await verifyPassword(password, hash), {
    valid: true,
    needsUpgrade: false
  });
  assert.equal((await verifyPassword('wrong-password', hash)).valid, false);
});

test('legacy plaintext password is marked for immediate upgrade', async () => {
  assert.deepEqual(await verifyPassword('legacy-password', 'legacy-password'), {
    valid: true,
    needsUpgrade: true
  });
});

test('signed token enforces issuer, audience, identity, and role', () => {
  const token = signAuthToken({
    _id: { toString: () => 'user-id-123' },
    email: 'user@example.com',
    role: 'client'
  });
  const claims = verifyAuthToken(token);

  assert.equal(claims.sub, 'user-id-123');
  assert.equal(claims.email, 'user@example.com');
  assert.equal(claims.role, 'client');
  assert.equal(claims.iss, 'fitness-tracker-test');
  assert.equal(claims.aud, 'fitness-tracker-test-client');
});

test('requireAuth rejects missing credentials', () => {
  const req = { get: () => undefined, cookies: {} };
  const res = createResponse();
  let called = false;

  requireAuth(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('requireAuth accepts the secure cookie and establishes identity', () => {
  const token = signAuthToken({
    _id: { toString: () => 'trainer-id' },
    email: 'trainer@example.com',
    role: 'trainer'
  });
  const req = {
    get: () => undefined,
    cookies: { [AUTH_COOKIE_NAME]: token }
  };
  const res = createResponse();
  let called = false;

  requireAuth(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.deepEqual(req.user, {
    id: 'trainer-id',
    email: 'trainer@example.com',
    role: 'trainer'
  });
});

test('role and ownership checks reject cross-user access', () => {
  const roleResponse = createResponse();
  requireRole('trainer')(
    { user: { role: 'client' } },
    roleResponse,
    () => assert.fail('client must not pass trainer authorization')
  );
  assert.equal(roleResponse.statusCode, 403);

  const selfResponse = createResponse();
  requireSelfParam('email')(
    {
      params: { email: 'other@example.com' },
      user: { email: 'user@example.com' }
    },
    selfResponse,
    () => assert.fail('cross-user request must not pass authorization')
  );
  assert.equal(selfResponse.statusCode, 403);
});

test('Lambda HTTP API adapter serves health without a database connection', async () => {
  const { handler } = require('../lambda');
  const response = await handler({
    version: '2.0',
    routeKey: '$default',
    rawPath: '/health',
    rawQueryString: '',
    headers: { host: 'example.execute-api.ap-south-1.amazonaws.com' },
    requestContext: {
      http: {
        method: 'GET',
        path: '/health',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'node-test'
      },
      requestId: 'test-request'
    },
    isBase64Encoded: false
  }, {});

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    status: 'ok',
    environment: 'development',
    version: 'local'
  });
});

test('MongoDB secret parsing supports JSON and never exposes credentials in logs', () => {
  const uri = 'mongodb+srv://username:password@example.mongodb.net/fitness';

  assert.equal(parseMongoSecret(JSON.stringify({ MONGODB_URI: uri })), uri);
  assert.equal(parseMongoSecret(uri), uri);
  assert.equal(
    redactMongoUri(uri),
    'mongodb+srv://***:***@example.mongodb.net/fitness'
  );
});

test('runtime secret parser supports raw and structured JWT values', () => {
  const secret = 'production-signing-secret-with-at-least-32-characters';

  assert.equal(parseSecret(secret, 'JWT_SECRET'), secret);
  assert.equal(parseSecret(JSON.stringify({ JWT_SECRET: secret }), 'JWT_SECRET'), secret);
  assert.throws(() => parseSecret('{}', 'JWT_SECRET'), /must contain JWT_SECRET/);
});
