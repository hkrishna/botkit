/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
          \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
           \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit is has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


var Botkit = require('./lib/Botkit.js');
var things = require('./lib/things.js');
var os = require('os');

var controller = Botkit.slackbot({
  // debug: true,
});

// console.log(process.env.token);

// TODO: deal with different skills differently
// but for now, ya know..
// things  = things.knowledgeable_things.concat(things.likeable_things);

var get_random_thing = function() {
  var keys  = Object.keys(things); 
  var key   = keys[Math.floor(Math.random()*keys.length)];
  var verb  = key == 'likeable_things' ? 'like' : 'know';
  var thing = things[key];

  return {
    verb: verb,
    thing: thing[Math.floor(Math.random() * thing.length)]
  }
};

var bot = controller.spawn(
  {
    token:process.env.token
  }
).startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
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
      // pattern: new RegExp(/^(pepperoni|sausage)/i),
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

controller.hears(['question'],'direct_message',function(bot,message) {

  bot.startConversation(message,function(err,convo) {
    var random_thing = get_random_thing();
    var thing = random_thing.thing;

    convo.ask('Do you ' + random_thing.verb + ' ' + thing + '?',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say("Great! me too");
          follow_up(convo, "Would you like to teach or spread the knowledge about " + thing + "?");
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        default:true,
        callback: function(response,convo) {
          var question = "Would you like to learn about " + thing +"?";
          var success_response = "awesome! here's a channel for you to join #"+thing;
          var default_response = "cool story bro";

          follow_up(convo, question, success_response, default_response);
          convo.next();
        }
      }
    ])
  });
})

