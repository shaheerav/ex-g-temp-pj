<<<<<<< HEAD
var createError = require('http-errors');
var express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config()

const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const categoryRouter = require('./routes/category');

const expressValidator = require('express-validator');

const connectDB = require('./config/connectDB');
var app = express();

connectDB();
app.use(session({
  secret: 'shrrree', // replace with a strong secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', usersRouter);
app.use('/admin', adminRouter);
app.use('/product',productRouter);
app.use('/category',categoryRouter);

const publicUploadsPath = path.join(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(publicUploadsPath));

app.use((req, res, next) => {
  res.status(404).render('users/404', {
    url: req.originalUrl,
    isLoggedIn: req.session.user || req.user,
    count: 0,
    message: "Page not found"
  });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('users/500', {
    error: err,
    isLoggedIn: req.session.user || req.user,
    count: 0
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
=======
var createError = require('http-errors');
var express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config()

const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const categoryRouter = require('./routes/category');

const expressValidator = require('express-validator');

const connectDB = require('./config/connectDB');
var app = express();

connectDB();
app.use(session({
  secret: 'shrrree', // replace with a strong secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', usersRouter);
app.use('/admin', adminRouter);
app.use('/product',productRouter);
app.use('/category',categoryRouter);

const publicUploadsPath = path.join(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(publicUploadsPath));

app.use((req, res, next) => {
  res.status(404).render('users/404', {
    url: req.originalUrl,
    isLoggedIn: req.session.user || req.user,
    count: 0,
    message: "Page not found"
  });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('users/500', {
    error: err,
    isLoggedIn: req.session.user || req.user,
    count: 0
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
>>>>>>> 5b98995eedf57a81eaa6279a9ee8017d69a64729
