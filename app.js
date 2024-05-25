var createError = require('http-errors');
var express = require('express');
const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/Trend_setter");
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
var app = express();

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
