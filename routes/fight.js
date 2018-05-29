var express = require('express')
var router = express.Router()
var createError = require('http-errors')

function requiresLogin (req, res, next) {
  if (req.session && req.session.userId) {
    return next()
  } else {
    return res.render('error', {
      message: 'You must be logged in to view this page.',
      error: createError(401)
    })
  }
}

router.get('/', requiresLogin, function (req, res, next) {
  res.render('fight')
})

module.exports = router
