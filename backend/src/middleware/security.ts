import { Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// CORS_ORIGIN: comma-separated list of allowed frontend origins (e.g. https://aura-crm.vercel.app).
// Not needed when the frontend is served by this server (same origin).
export function buildCors() {
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(o => o && o !== '*');
  const allowed = process.env.NODE_ENV === 'production' ? configured : [...configured, ...DEV_ORIGINS];

  return cors({
    origin: (origin, callback) => callback(null, !origin || allowed.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
}

export function buildHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  });
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600, // a whole shop's tablets usually share one IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' }
});

// Failed PIN attempts per device + staff member
export const pinLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip}:${String(req.body?.staff_id || '')}`,
  message: { error: 'Too many incorrect PIN attempts. Try again in 15 minutes.' }
});

// Failed PIN attempts per device across all staff members
export const pinLoginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many incorrect PIN attempts from this device. Try again later.' }
});
