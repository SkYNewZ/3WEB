var mongoose = require('mongoose')
var bcrypt = require('bcrypt')
var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  passwordConf: {
    type: String,
    required: true
  },
  totalScore: {
    type: Number,
    required: false,
    default: 0
  }
})

// hashing a password before saving it to the database
UserSchema.pre('save', function (next) {
  var user = this
  bcrypt.hash(user.password, 10, function (err, hash) {
    if (err) {
      return next(err)
    }
    user.password = hash
    user.passwordConf = hash
    next()
  })
})

UserSchema.statics.authenticate = function (email, password, callback) {
  User.findOne({ email: email })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
        var notFoundError = new Error('User not found.')
        notFoundError.status = 401
        return callback(notFoundError)
      }
      bcrypt.compare(password, user.password, function (err, result) {
        if (err) {
          return callback(err)
        }
        if (result === true) {
          return callback(null, user)
        } else {
          return callback()
        }
      })
    })
}

UserSchema.static.setScore = function (newScore, userId, callback) {
  User.findOneAndUpdate({ _id: userId }, { score: newScore }, function (err, user) {
    if (err) {
      return callback(err)
    } else if (!user) {
      var notFoundError = new Error('User not found.')
      notFoundError.status = 404
      return callback(notFoundError)
    }
    return callback(user)
  })
}

var User = mongoose.model('User', UserSchema)
module.exports = User
