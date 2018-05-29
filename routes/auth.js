var express = require('express')
var router = express.Router()
var User = require('../models/user')
var mongoose = require('mongoose')
var config
if (process.env.NODE_ENV === 'production') {
  config = require('../config/config.prod')
} else {
  config = require('../config/config')
}
var createError = require('http-errors')
mongoose.connect(config.mongourl)

router.post('/register', function (req, res, next) {
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {
    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf
    }
    // use schema.create to insert data into the db
    User.create(userData, function (err, user) {
      if (err) {
        return res.redirect('/?error=' + JSON.stringify(err))
      } else {
        return res.redirect('/')
      }
    })
  } else {
    var e = createError(400)
    return res.redirect('/?error=' + JSON.stringify(e))
  }
})

router.post('/login', function (req, res, next) {
  if (req.body.email && req.body.password) {
    User.authenticate(req.body.email, req.body.password, function (error, user) {
      if (error || !user) {
        var e = createError(401)
        return res.redirect('/?error=' + JSON.stringify(e))
      } else {
        req.session.userId = user._id
        return res.redirect('/lobby')
      }
    })
  } else {
    var e = createError(400)
    return res.redirect('/?error=' + JSON.stringify(e))
  }
})

router.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err)
      } else {
        return res.redirect('/')
      }
    })
  }
})

module.exports = router
