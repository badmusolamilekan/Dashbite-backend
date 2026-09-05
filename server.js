import 'dotenv/config';
import connectDB from './config/db.js';
import ensureAdminUser from './services/ensureAdminUser.js';
import seedDemoData from './services/seedDemoData.js';
import { verifyEmailConnection } from './services/sendEmail.js';
import app from './app.js';


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();
  await seedDemoData().catch((error) => {
    console.warn(`Demo seed skipped: ${error.message}`);
  });

  // Verify email connection on startup
  console.log("[INIT] Checking email configuration...");
  const emailReady = await verifyEmailConnection();
  if (emailReady) {
    console.log("[INIT] Email service is ready");
  } else {
    console.warn("[INIT] Email service is NOT configured properly");
  }

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});
