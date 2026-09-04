import 'dotenv/config';
import connectDB from './config/db.js';
import ensureAdminUser from './services/ensureAdminUser.js';
import seedDemoData from './services/seedDemoData.js';
import app from './app.js';


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();
  await seedDemoData().catch((error) => {
    console.warn(`Demo seed skipped: ${error.message}`);
  });
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
