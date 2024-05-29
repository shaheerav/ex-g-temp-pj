const {check,validationResult} = require ('express-validator');

const validat =[check('name','pleas enter valid product name')
    .isLength({min:5,max:50}),

]
module.exports = validat