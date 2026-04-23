const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        msg: 'Please verify your email address to perform this action.',
        unverified: true 
      });
    }

    next();
  } catch (err) {
    console.error('Verified middleware error:', err);
    res.status(500).send('Server Error');
  }
};
