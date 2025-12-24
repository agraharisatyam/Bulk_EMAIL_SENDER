// src/app.ts - UPDATED WITH USER MANAGEMENT
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { config } from "dotenv";

// Import middleware
import { authMiddleware } from "./middleware/auth";

// Import routes
import authRoutes from "./routes/auth";
import sendRoutes from "./routes/send";
import reportRoutes from "./routes/report";
import configRoutes from "./routes/config";
import dashboardRoutes from "./routes/dashboard";

// Load environment variables
config();

const app = new Hono();

// Middleware
app.use("*", cors({
	origin: ['http://localhost:5173', 'http://localhost:3000'],
	credentials: true,
}));
app.use("*", logger());

// Apply authentication middleware to all routes except auth routes
app.use("*", async (c, next) => {
  const path = c.req.path;

  // Public paths that don't require authentication (auth endpoints + health)
  const publicPrefixes = ["/auth/", "/health"];

  // Skip auth for public paths
  if (publicPrefixes.some((p) => path.startsWith(p))) {
    return await next();
  }

  // Apply auth middleware for protected routes
  return await authMiddleware(c, next);
});

// Initialize directories
async function initializeDirectories() {
  const dirs = ["./uploads", "./logs", "./data"];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

// Routes
app.route("/", authRoutes); // Auth routes (login, register, logout)
app.route("/", sendRoutes); // Email sending functionality
app.route("/", reportRoutes); // Reports and analytics
app.route("/", configRoutes); // User SMTP configurations
app.route("/", dashboardRoutes);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0.0-with-auth",
  });
});

// User info endpoint (for frontend)
app.get("/user/info", async (c) => {
  try {
    const token = c.req.cookie("session_token");
    if (!token) {
      return c.json({ success: false, message: "Not authenticated" }, 401);
    }

    const { userDatabase } = await import("./services/userDatabase");
    const user = userDatabase.validateSession(token);
    if (!user) {
      return c.json({ success: false, message: "Session expired" }, 401);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return c.json({ success: false, message: "Error fetching user info" }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  const path = c.req.path;

  // If it's an API call, return JSON
  if (
    path.startsWith("/api/") ||
    path.startsWith("/config/") ||
    path.startsWith("/send") ||
    path.startsWith("/report")
  ) {
    return c.json({ message: "Endpoint not found" }, 404);
  }

  // For non-API paths just return a generic 404
  return c.json({ message: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Application error:", err);

  // If it's an authentication error, redirect to login
  if (
    err.message.includes("Authentication") ||
    err.message.includes("Session")
  ) {
    return c.redirect("/login");
  }

  return c.json(
    {
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// Initialize and start server
const port = process.env.PORT || 3000;

console.log("🚀 Initializing Bulk Email Sender with User Management...");
await initializeDirectories();

// Display configuration status
console.log("\n📋 Configuration Status:");
if (process.env.SMTP_HOST) {
  console.log("✅ Global SMTP configuration found in environment variables");
  console.log(`   Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   From: ${process.env.FROM_EMAIL}`);
  console.log("   📝 Note: Users can create their own SMTP configurations");
} else {
  console.log("⚠️  No global SMTP configuration found in .env file");
  console.log("   📝 Users will need to configure their own SMTP settings");
}

console.log("\n🔐 Authentication Features:");
console.log("✅ User registration and login");
console.log("✅ Session-based authentication");
console.log("✅ User-specific SMTP configurations");
console.log("✅ Secure password hashing with Argon2");

console.log(`\n🌐 API server starting on port ${port}`);
console.log(`   📡 Base URL: http://localhost:${port}`);

// Clean up expired sessions on startup
setTimeout(async () => {
  try {
    const { userDatabase } = await import("./services/userDatabase");
    userDatabase.cleanExpiredSessions();
    console.log("🧹 Cleaned expired sessions on startup");
  } catch (error) {
    console.error("Error cleaning expired sessions:", error);
  }
}, 1000);

export default {
  port,
  fetch: app.fetch,
};
