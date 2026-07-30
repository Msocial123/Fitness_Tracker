const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'fitness_auth';
const TOKEN_TTL_SECONDS = 60 * 60;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  return secret;
};

const tokenOptions = () => ({
  audience: process.env.JWT_AUDIENCE || 'fitness-tracker-web',
  issuer: process.env.JWT_ISSUER || 'fitness-tracker'
});

const signAuthToken = (user) => jwt.sign(
  {
    email: user.email,
    role: user.role
  },
  getJwtSecret(),
  {
    ...tokenOptions(),
    expiresIn: TOKEN_TTL_SECONDS,
    subject: user._id.toString()
  }
);

const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret(), tokenOptions());

const authCookieOptions = () => ({
  httpOnly: true,
  maxAge: TOKEN_TTL_SECONDS * 1000,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
  path: '/'
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
};

const clearAuthCookie = (res) => {
  const { maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
};

module.exports = {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken
};
