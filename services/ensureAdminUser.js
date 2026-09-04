import User from '../models/User.js';

const ensureAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is missing; admin bootstrap skipped.');
    return;
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  let admin = await User.findOne({ email }).select('+password');

  if (!admin) {
    admin = await User.create({
      name: 'Administrator',
      email,
      password,
      phone: '+2348000000001',
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin account created for ${email}`);
    return;
  }

  const passwordMatches = await admin.matchPassword(password);
  admin.role = 'admin';
  admin.isVerified = true;
  admin.isSuspended = false;
  if (!passwordMatches) admin.password = password;
  await admin.save({ validateBeforeSave: false });
};

export default ensureAdminUser;
