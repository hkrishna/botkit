var _ = require('lodash')
var orm = require("orm")
var util = require('util')

var connection = null

var upsert = function(model, id, attributes) {
  model.get(id, function(err, existing_object) {
    if (err) {
      return model.create(attributes, function(err, new_object) {
        if (err) throw err
        // console.log("Created " + new_object.id)
      })
    } else {
      _.merge(existing_object, attributes)
      existing_object.save(function(err){
        // console.log("Updated " + id)
      })
    }
  })
}

module.exports = function(cb) {
  if (connection) return cb(null, connection)

  var User, Question, Answer, Team, Channel

  orm.connect(process.env.DATABASE_URL, function(err, db) {
    if (err) return console.error('Connection error: ' + err)

    User = db.define("users", {
      id: { type: 'text', size: 16, key: true },
      name: String,
      first_name: String,
      last_name: String,
      real_name: String,
      deleted: { type: 'boolean' }
    })

    Question = db.define("questions", {
      id: { type: 'serial', key: true },
      type: String,
      channel: String,
      text: String
    })

    Answer = db.define("answers", {
      id: { type: 'serial', key: true },
      user_id: { type: 'text', size: 16, key: true },
      question_id: { type: 'serial', key: true },
      text: String
    }, { methods: {
      similar: function(cb){
        db.driver.execQuery(
          "SELECT users.* from users join answers on users.id = answers.user_id where answers.question_id = ?? and answers.id != ??"
          [this.question_id, this.id],
          cb
        )
      }
    }})

    Team = db.define("teams", {
      id: { type: 'serial', key: true }
    })

    Channel = db.define("channels", {
      id: { type: 'serial', key: true }
    })

    User.upsert = _.curry(upsert)(User)
    Answer.upsert = _.curry(upsert)(Answer)
    Question.upsert = _.curry(upsert)(Question)

    Answer.hasOne('question', Question)
    Answer.hasOne('user', User)

    Question.random = function(user_id, cb) {
      User.get(user_id, function(err, user){
        if (err) throw err

        db.driver.execQuery(
          "SELECT questions.* FROM questions LEFT OUTER JOIN answers ON answers.question_id = questions.id AND answers.user_id = '??' WHERE answers.id IS NULL ORDER BY random() LIMIT 1",
          [user_id],
          cb
        )
      })
    }

    connection = db

    this.User = User
    this.Answer = Answer
    this.Question = Question
    this.Team = Team
    this.Channel = Channel

    db.sync(function(err) {
      if (err) return console.error('Sync error: ' + err);
      cb(null, db)
    })
  })
}
