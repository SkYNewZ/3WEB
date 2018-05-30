var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var sassMiddleware = require('node-sass-middleware')
var session = require('express-session')
var MongoStore = require('connect-mongo')(session)
var mongoose = require('mongoose')

var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')
var authRouter = require('./routes/auth')
var lobbyRouter = require('./routes/lobby')
var fightRouteur = require('./routes/fight')

var app = express()
var server = require('http').Server(app)
server.listen(1234)
var io = require('socket.io')(server)

var usernameAndId = {} // list of actuals connected users and their socket id
var userInLobby = {} // user in lobby
var currentGames = {} // list current games with users and room ID
var players = {}

io.on('connection', function (socket) {
  // receive a new user
  socket.on('new_user', function (user) {
    usernameAndId[user] = socket.id
    userInLobby[user] = socket.id
    io.emit('lobby_list_users', userInLobby)
  })

  socket.on('new_user_in_game', function (username, roomId) {
    // clean for finished games
    for (const key in players) {
      if (players.hasOwnProperty(key)) {
        if (players[key].result !== null) {
          delete players[key]
        }
      }
    }

    // verif si deja 2 joueurs dans le room
    var playerToken = 0
    for (let id in players) {
      if (players[id].roomId === roomId) {
        playerToken++
      }
    }
    if (playerToken === 0) {
      players[socket.id] = {
        roomId: roomId,
        username: username,
        order: 1,
        hp: 100,
        x: 200,
        y: 450 - 2,
        width: 70,
        height: 150,
        result: null,
        displayPunch: false,
        damage: 10
      }
    } else {
      players[socket.id] = {
        roomId: roomId,
        username: username,
        order: 2,
        hp: 100,
        x: 560,
        y: 450 - 2,
        width: 70,
        height: 150,
        result: null,
        displayPunch: false,
        damage: 10
      }
    }
  })

  socket.on('disconnectFromGame', function () {
    delete players[socket.id]
  })

  socket.on('user_deco', function (user) {
    delete userInLobby[user]
    delete usernameAndId[user]
    io.emit('lobby_list_users', userInLobby)
  })

  // change the gameboard
  var fired = false
  socket.on('movement', function (data, roomId) {
    var player = players[socket.id] || {}
    var order = player.order
    var otherPlayer = null
    var width = 800

    for (const id in players) {
      if (players.hasOwnProperty(id)) {
        if (players[id].roomId === roomId && players[id].order !== order) {
          otherPlayer = players[id]
        }
      }
    }

    if (data.left && (player.x - 5) > 0) {
      player.x -= 5
    }
    if (data.right && (player.x + 5) < width - player.width) {
      player.x += 5
    }
    // display puch
    player.displayPunch = data.punch

    if (data.punch === true && otherPlayer) { // if the current user is punching
      if (player.order === 1) { // if it is the first player, for the coordonate
        if (
          (player.x + player.width + 30) >= otherPlayer.x && (player.x + player.width + 30) < otherPlayer.x + otherPlayer.width && !fired
        ) {
          // player 1 hit the player 2
          if (player.hp - 10 >= 0) { player.hp -= 10 }
          fired = true
        }
      } else if (player.order === 2) { // if the second player hit the first
        if (
          (player.x - 30) <= otherPlayer.x + otherPlayer.width && (player.x + player.width + 30) > otherPlayer.x && !fired
        ) {
          // player 2 hit the player 1
          if (player.hp - 10 >= 0) { player.hp -= 10 }
          fired = true
        }
      }
    } else {
      fired = false
    }

    // check if one player is dead
    if (player && player.hp <= 0 && otherPlayer) {
      otherPlayer.result = 'loose'
      player.result = 'victory'
    } else if (otherPlayer && otherPlayer.hp <= 0 && otherPlayer) {
      otherPlayer.result = 'victory'
      player.result = 'loose'
    }
  })

  // resend game board
  setInterval(function () {
    io.sockets.emit('state', players)
  }, 1000 / 60)

  socket.on('disconnectFromLobby', function (user) {
    delete userInLobby[user]
  })

  socket.on('chat_message', function (msg) {
    socket.broadcast.emit('chat_message', msg)
  })

  socket.on('invitation', function (data) {
    // console.log(`${data.from} send an invitation to ${data.to}`)
    socket.to(usernameAndId[data.to]).emit('receive_invitation', {
      to: data.to,
      from: data.from,
      message: data.message
    })
  })

  socket.on('join', function (data) {
    // console.log(`ROOM: ${data.room}: ${data.user} join a party, wainting ${data.against}`)
    delete userInLobby[data.user]
    delete userInLobby[data.against]
    io.emit('lobby_list_users', userInLobby)
    socket.to(usernameAndId[data.against]).emit('join', {
      room: data.room,
      user: data.user,
      against: data.against
    })
  })

  socket.on('update_socket_info', function (data) {
    usernameAndId[data.user] = data.socketId
  })
})

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}))
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
  secret: 'QDkfN2eLtVQby4UF',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  })
}))

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/api/auth', authRouter)
app.use('/lobby', lobbyRouter)
app.use('/fight', fightRouteur)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
