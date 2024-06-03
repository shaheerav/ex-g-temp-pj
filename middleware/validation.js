const { body, validationResult } = require('express-validator');

const validateUpdateProfile = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('mobile').isMobilePhone('any').withMessage('Invalid mobile number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
    validateUpdateProfile
}