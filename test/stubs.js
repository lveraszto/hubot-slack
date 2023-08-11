'use strict';

require('../src/extensions');
const SlackClient = require('../src/client');
const { SlackTextMessage } = require('../src/message');
const SlackBot = require('../src/bot');
const EventEmitter = require('events');
// Use Hubot's brain in our stubs
const { Robot, Brain } = require('hubot/es2015');

// Stub a few interfaces to grease the skids for tests. These are intentionally
// as minimal as possible and only provide enough to make the tests possible.
// Stubs are recreated before each test.
beforeEach(function() {
  const stubs = {};
  stubs._sendCount = 0;
  stubs.send = (conversationId, text, opts) => {
    stubs._room = conversationId;
    stubs._opts = opts;
    if ((/^[UD@][\d\w]+/.test(conversationId)) || (conversationId === stubs.DM.id)) {
      stubs._dmmsg = text;
    } else {
      stubs._msg = text;
    }
    return stubs._sendCount = stubs._sendCount + 1;
  };
  // These objects are of conversation shape: https://api.slack.com/types/conversation
  stubs.channel = {
    id: 'C123',
    name: 'general'
  };
  stubs.DM = {
    id: 'D1232',
    is_im: true
  };
  stubs.group = {
    id: 'G12324',
    is_mpim: true
  };
  // These objects are conversation IDs used to siwtch behavior of another stub
  stubs.channelWillFailChatPost = "BAD_CHANNEL";
  // These objects are of user shape: https://api.slack.com/types/user
  stubs.user = {
    id: 'U123',
    name: 'name', // NOTE: this property is dynamic and should only be used for display purposes
    real_name: 'real_name',
    profile: {
      email: 'email@example.com'
    },
    misc: 'misc'
  };
  stubs.userperiod = {
    name: 'name.lname',
    id: 'U124',
    profile: {
      email: 'name.lname@example.com'
    }
  };
  stubs.userhyphen = {
    name: 'name-lname',
    id: 'U125',
    profile: {
      email: 'name-lname@example.com'
    }
  };
  stubs.usernoprofile = {
    name: 'name',
    real_name: 'real_name',
    id: 'U126',
    misc: 'misc'
  };
  stubs.usernoemail = {
    name: 'name',
    real_name: 'real_name',
    id: 'U126',
    profile: {
      foo: 'bar'
    },
    misc: 'misc'
  };
  stubs.userdeleted = {
    name: 'name',
    id: 'U127',
    deleted: true
  };
  stubs.bot = {
    name: 'testbot',
    id: 'B123',
    user_id: 'U123'
  };
  stubs.undefined_user_bot = {
    name: 'testbot',
    id: 'B789'
  };
  stubs.slack_bot = {
    name: 'slackbot',
    id: 'B01',
    user_id: 'USLACKBOT'
  };
  stubs.self = {
    name: 'self',
    id: 'U456',
    bot_id: 'B456',
    profile: {
      email: 'self@example.com'
    }
  };
  stubs.self_bot = {
    name: 'self',
    id: 'B456',
    profile: {
      email: 'self@example.com'
    }
  };
  stubs.org_user_not_in_workspace = {
    name: 'name',
    id: 'W123',
    profile: {
      email: 'org_not_in_workspace@example.com'
    }
  };
  stubs.org_user_not_in_workspace_in_channel = {
    name: 'name',
    id: 'W123',
    profile: {
      email: 'org_not_in_workspace@example.com'
    }
  };
  stubs.team = {
    name: 'Example Team',
    id: 'T123'
  };
  stubs.expired_timestamp = 1528238205453;
  stubs.event_timestamp = '1360782804.083113';
  // Slack client
  stubs.client = {
    dataStore: {
      getUserById: (id) => stubs.client.dataStore.users?.find(user => user.id === id),
      getBotById: (id) => stubs.client.dataStore.bots?.find(user => user.id === id),
      getUserByName: (name) => stubs.client.dataStore.users?.find(user => user.name === name),
      getChannelById: (id) => stubs.channel.id === id ? stubs.channel : void 0,
      getChannelGroupOrDMById: (id) => stubs.channel.id === id ? stubs.channel : void 0,
      getChannelGroupOrDMByName: (name) => stubs.channel.name === name ? stubs.channel : stubs.client.dataStore.dms.find(dm => dm.name === name),
      users: [stubs.user, stubs.self, stubs.userperiod, stubs.userhyphen],
      bots: [stubs.bot],
      dms: [{
        name: 'user2',
        id: 'D5432'
      }]
    }
  };
  stubs.rtm = {
    start: () => {
      return stubs._connected = true;
    },
    disconnect: () => {
      return stubs._connected = false;
    },
    sendMessage: (msg, room) => {
      return stubs.send(room, msg);
    },
    dataStore: {
      getUserById: (id) => {
        switch (id) {
          case stubs.user.id:
            return stubs.user;
          case stubs.bot.id:
            return stubs.bot;
          case stubs.self.id:
            return stubs.self;
          case stubs.self_bot.id:
            return stubs.self_bot;
          default:
            return void 0;
        }
      },
      getChannelGroupOrDMById: (id) => {
        switch (id) {
          case stubs.channel.id:
            return stubs.channel;
          case stubs.DM.id:
            return stubs.DM;
        }
      }
    }
  };
  stubs.chatMock = {
    postMessage: (opts) => {
      if (opts.channel === stubs.channelWillFailChatPost) {
        return Promise.reject(new Error("stub error"));
      }
      stubs.send(opts.channel, opts.text, opts);
      return Promise.resolve();
    }
  };
  stubs.conversationsMock = {
    setTopic: ({ topic }) => {
      stubs._topic = topic;
      if (stubs.receiveMock.onTopic != null) {
        stubs.receiveMock.onTopic(stubs._topic);
      }
      return Promise.resolve();
    },
    info: (conversation) => {
      if (conversation.channel === stubs.channel.id) {
        return Promise.resolve({
          ok: true,
          channel: stubs.channel
        });
      } else if (conversation.channel === stubs.DM.id) {
        return Promise.resolve({
          ok: true,
          channel: stubs.DM
        });
      } else if (conversation.channel === 'C789') {
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('conversationsMock could not match conversation ID'));
      }
    }
  };
  stubs.botsMock = {
    info: (event) => {
      const botId = event.bot;
      if (botId === stubs.bot.id) {
        return Promise.resolve({
          ok: true,
          bot: stubs.bot
        });
      } else if (botId === stubs.undefined_user_bot.id) {
        return Promise.resolve({
          ok: true,
          bot: stubs.undefined_user_bot
        });
      } else {
        return Promise.reject(new Error('botsMock could not match bot ID'));
      }
    }
  };
  stubs.usersMock = {
    list: (opts) => {
      stubs._listCount = stubs._listCount ? stubs._listCount + 1 : 1;
      if (stubs._listError) {
        return Promise.resolve({ error: new Error('mock error') });
      }
      if (opts?.cursor === 'mock_cursor') {
        return Promise.resolve(stubs.userListPageLast);
      } else {
        return Promise.resolve(stubs.userListPageWithNextCursor);
      }
    },
    info: ({ user }) => {
      if (user === stubs.user.id) {
        return Promise.resolve({
          ok: true,
          user: stubs.user
        });
      } else if (user === stubs.org_user_not_in_workspace.id) {
        return Promise.resolve({
          ok: true,
          user: stubs.org_user_not_in_workspace
        });
      } else if (user === 'U789') {
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('usersMock could not match user ID'));
      }
    }
  };
  stubs.userListPageWithNextCursor = {
    members: [
      {
        id: 1
      },
      {
        id: 2
      },
      {
        id: 4,
        profile: {
          bot_id: 'B1'
        }
      }
    ],
    response_metadata: {
      next_cursor: 'mock_cursor'
    }
  };
  stubs.userListPageLast = {
    members: [
      {
        id: 3
      }
    ],
    response_metadata: {
      next_cursor: ''
    }
  };
  stubs.responseUsersList = {
    ok: true,
    members: [stubs.user, stubs.userperiod]
  };
  stubs.wrongResponseUsersList = {
    ok: false,
    members: []
  };
  // Hubot.Robot instance
  stubs.robot = (() => {
    const robot = new EventEmitter();
    // noop the logging
    robot.logger = {
      logs: {},
      log: (type, message) => {
        if (!robot.logger.logs[type]) {
          robot.logger.logs[type] = [];
        }
        return robot.logger.logs[type].push(message);
      },
      info: message => {
        return robot.logger.log('info', message);
      },
      debug: message => {
        return robot.logger.log('debug', message);
      },
      error: message => {
        return robot.logger.log('error', message);
      },
      warning: message => {
        return robot.logger.log('warning', message);
      }
    };
    // attach a real Brain to the robot
    robot.brain = new Brain(robot);
    robot.name = 'bot';
    robot.listeners = [];
    robot.listen = Robot.prototype.listen.bind(robot);
    robot.react = Robot.prototype.react.bind(robot);
    robot.hearReaction = Robot.prototype.hearReaction.bind(robot);
    robot.presenceChange = Robot.prototype.presenceChange.bind(robot);
    robot.fileShared = Robot.prototype.fileShared.bind(robot);
    return robot;
  })();
  stubs.callback = (() => "done")();
  stubs.receiveMock = {
    receive: (message, user) => {
      stubs._received = message;
      if (stubs.receiveMock.onReceived != null) {
        return stubs.receiveMock.onReceived(message);
      }
    }
  };
  this.stubs = stubs;
  // Generate a new slack instance for each test.
  this.slackbot = new SlackBot(stubs.robot, {
    token: 'xoxb-faketoken'
  });
  Object.assign(this.slackbot.client, stubs.client);
  Object.assign(this.slackbot.client.rtm, stubs.rtm);
  Object.assign(this.slackbot.client.web.chat, stubs.chatMock);
  Object.assign(this.slackbot.client.web.users, stubs.usersMock);
  Object.assign(this.slackbot.client.web.conversations, stubs.conversationsMock);
  Object.assign(this.slackbot, stubs.receiveMock);
  this.slackbot.self = stubs.self;
  this.slacktextmessage = new SlackTextMessage(stubs.self, void 0, void 0, {
    text: void 0
  }, stubs.channel.id, void 0, this.slackbot.client);
  this.slacktextmessage_invalid_conversation = new SlackTextMessage(stubs.self, void 0, void 0, {
    text: void 0
  }, 'C888', void 0, this.slackbot.client);
  this.client = new SlackClient({
    token: 'xoxb-faketoken'
  }, stubs.robot);
  Object.assign(this.client.rtm, stubs.rtm);
  Object.assign(this.client.web.chat, stubs.chatMock);
  Object.assign(this.client.web.conversations, stubs.conversationsMock);
  Object.assign(this.client.web.users, stubs.usersMock);
  return Object.assign(this.client.web.bots, stubs.botsMock);
});
