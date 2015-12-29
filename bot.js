var Botkit = require('./lib/Botkit.js');
var questions = require('./fixtures/questions');
var os = require('os')
var database = require('./models/db')
var util = require('util')

var log_if_error = function(err) {
  if (err) throw console.error("ZOMG " + err)
}

database(function(err, db) {
  log_if_error(err)
})

var controller = Botkit.slackbot({
  storage: require('./lib/sql_storage')(database)
  // debug: true,
});


// TODO just look up users from process.env var
var users = {
  tom: 'U03KGPALT',
  harish: 'U088YDDCZ'
};

var sync_users = function(users) {
  console.log("Importing users ...")
  database(function(err, db) {
    log_if_error(err);

    for (user of users) {
      User.upsert(
        user.id,
        {
          id: user.id,
          name: user.name,
          first_name: user.profile.first_name,
          last_name: user.profile.last_name,
          real_name: user.profile.real_name,
          deleted: user.profile.deleted
        }
      )
    }

    console.log("Import complete!")
    User.count(function(err, val) {
      console.log("Total users: " + val)  
    })
  })
}

var sync_questions = function(questions) {
  database(function(err, db){
    log_if_error(err);

    for (question of questions) {
      Question.upsert(
        question[0],
        {
          id: question[0],
          type: question[1],
          channel: question[2],
          text: question[3]
        }
      )
    }

    Question.count(function(err, val){
      console.log("Total questions: " + val)
    })
  })
}

var bot = controller.spawn(
  { token:process.env.SLACK_TOKEN }
).startRTM(function(err, bot, payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  } else {
    sync_users(payload.users)
    sync_questions(questions)
  }
});

var port = 3000;

controller.setupWebserver(port,function(err,express_webserver) {
  controller.createWebhookEndpoints(express_webserver)
});

var follow_up = function(convo, question, success_response, default_response) {
  success_response = success_response || "awesome!";
  default_response = default_response || "hmm, ok";
  convo.ask(question ,[
    {
      pattern: bot.utterances.yes,
      callback: function(response,convo) {
        convo.say(success_response);
        convo.next();
      }
    },
    {
      pattern: new RegExp(),
      default:true,
      callback: function(response, convo) {
        convo.say(default_response);
        convo.next();
      }
    }
  ]);
}

var start_convo = function(convo) {
  database(function(err, db){
    if (err) throw err
    var meow = null
    console.log("Asking a random question to " + convo.source_message.user)

    Question.random(convo.source_message.user, function(err, data) {
      convo.question = data[0]
      console.log(util.inspect(convo.question))

      convo.ask(convo.question.text, [
        {
          pattern: bot.utterances.yes,
          callback: function(response,convo) {
            database(function(err, db) {
              log_if_error(err);

              Answer.create(
                {
                  question_id: convo.question.id,
                  user_id: convo.source_message.user,
                  text: "yes"
                },
                function(err, answer) {
                  log_if_error(err);
                  convo.say("Talk with " + ['foo','bar','baz'].join(', ') + " in #" + convo.question.channel);
                  // answer.similar(function(err, data) {
                  //   if (err) throw err
                  //   console.log(util.inspect(err))
                  //   convo.say("Talk with " + data.join(', ') + " in #" + convo.question.channel);
                  // })
                }
              );
            });

            // follow_up(convo, "Would you like to teach or spread the knowledge about " + thing + "?");
            convo.next();
          }
        },
        {
          pattern: bot.utterances.no,
          default:true,
          callback: function(response, convo) {
            database(function(err, db) {
              log_if_error(err);

              Answer.create(
                {
                  question_id: convo.question.id,
                  user_id: convo.source_message.user,
                  text: "no"
                },
                function(err, answer) {
                  log_if_error(err);
                  return answer;
                }
              );
            });

            // var question = "Would you like to learn about " + thing +"?";
            // var success_response = "awesome! here's a channel for you to join #"+thing;
            // var default_response = "cool story bro";

            // follow_up(convo, question, success_response, default_response);
            convo.next();
          }
        }
      ])

    })
  })

}

bot.startPrivateConversation({ user: users.tom }, function(err, convo){
  start_convo(convo);
});

controller.hears(['question'],'direct_message',function(bot,message) {

  bot.startConversation(message,function(err,convo) {
    start_convo(convo);
  });
})
