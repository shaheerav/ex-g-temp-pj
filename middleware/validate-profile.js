const  { check , validationResult} = require('express-validator')

const profileValidate =  [
    check('name').notEmpty().withMessage('Name is required'),
    check('username').notEmpty().withMessage('Username is required'),
    check('email').isEmail().withMessage('Invalid email address'),
    check('mobile').notEmpty().withMessage('Mobile number is required')

]
module.exports = {
    profileValidate
}