var database = require('../models/db')

var find_or_create_by_id = function(model, id) {
  model.get(id, function(err, existing_object) {
    if (err) {
      return model.create({ id: id }, function(err, new_object) {
        if (err) throw err
        return new_object
      })
    } else {
      return existing_object
    }
  })
}

module.exports = function(database) {
  var storage = {
    teams: {
      get: function(team_id, cb) {
        database(function(err, db) {
          Team.get(team_id, cb)
        })
      },
      save: function(team, cb) {
        database(function(err, db) {
          cb(find_or_create_by_id(Team, team.id))
        })
      },
      all: function(cb) {
        database(function(err, db) {
          Team.all({}, cb)
        })
      }
    },
    users: {
      get: function(user_id, cb) {
        database(function(err, db) {
          User.get(user_id, cb)
        })
      },
      save: function(user, cb) {
        database(function(err, db) {
          cb(find_or_create_by_id(User, user.id))
        })
      },
      all: function(cb) {
        database(function(err, db) {
          User.all(cb)
        })
      }
    },
    channels: {
      get: function(channel_id, cb) {
        database(function(err, db) {
          Channel.get(channel_id, cb)
        })
      },
      save: function(channel, cb) {
        database(function(err, db) {
          cb(find_or_create_by_id(Channel, channel.id))
        })
      },
      all: function(cb) {
        database(function(err, db) {
          Channel.all(cb)
        })
      }
    }
  };

  return storage;
}
