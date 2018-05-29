var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
  var toReturn = {}
  toReturn['title'] = 'SupFight'
  if (req.query.error) {
    var e = JSON.parse(req.query.error)
    toReturn['error'] = e.message
  }
  res.render('index', toReturn)
})

module.exports = router
