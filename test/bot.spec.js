'use strict';

const { loadBot } = require('hubot');
require('./stubs');
const { SlackTextMessage, ReactionMessage, PresenceMessage, FileSharedMessage} = require('../src/message');

describe('Adapter', function() {
  it('Should initialize with a robot', function() {
    expect(this.slackbot.robot).to.be.eql(this.stubs.robot);
  });

  it.skip('Should load an instance of Robot with extended methods', function() {
    const loadedRobot = loadBot('', 'slack', false, 'Hubot');

    // Check to make sure presenceChange and react are loaded to Robot
    expect(typeof (loadedRobot.presenceChange)).to.be.eql('function');
    expect(loadedRobot.presenceChange.length).to.be.eql(3);
    expect(typeof (loadedRobot.react)).to.be.eql('function');
    expect(loadedRobot.react.length).to.be.eql(3);
    expect(typeof (loadedRobot.fileShared)).to.be.eql('function');
    expect(loadedRobot.react.fileShared).to.be.eql(3);
  });
});

describe('Connect', function() {
  it('Should connect successfully', function() {
    this.slackbot.run();
    expect(this.stubs._connected).to.be.true;
  });
});

describe('Authenticate', function() {
  it('Should authenticate successfully', function() {
    const { logger } = this.slackbot.robot;
    const start = {
      self: {
        id: this.stubs.self.id,
        name: this.stubs.self.name
      },
      team: {
        id: this.stubs.team.id,
        name: this.stubs.team.name
      },
      users: [this.stubs.self, this.stubs.user]
    };
    this.slackbot.authenticated(start);
    expect(this.slackbot.self.id).to.eql(this.stubs.self.id);
    expect(this.slackbot.robot.name).to.eql(this.stubs.self.name);
    expect(logger.logs["info"].length).to.be.greaterThan(0);
    expect(logger.logs["info"][logger.logs["info"].length - 1]).to.eql(`Logged in as @${this.stubs.self.name} in workspace ${this.stubs.team.name}`);
  });
});

describe('Logger', function() {
  it('It should log missing token error', function() {
    const { logger } = this.slackbot.robot;
    this.slackbot.options.token = null;
    this.slackbot.run();
    expect(logger.logs["error"].length).to.be.greaterThan(0);
    expect(logger.logs["error"][logger.logs["error"].length - 1]).to.eql('No token provided to Hubot');
  });

  it('It should log invalid token error', function() {
    const { logger } = this.slackbot.robot;
    this.slackbot.options.token = "ABC123";
    this.slackbot.run();
    expect(logger.logs["error"].length).to.be.greaterThan(0);
    expect(logger.logs["error"][logger.logs["error"].length - 1]).to.eql('Invalid token provided, please follow the upgrade instructions');
  });
});

describe('Disable Sync', function() {
  it('Should sync users by default', function() {
    this.slackbot.run();
    expect(this.slackbot.robot.brain.data.users).to.have.keys('1', '2', '3', '4');
  });
  it('Should not sync users when disabled', function() {
    this.slackbot.options.disableUserSync = true;
    this.slackbot.run();
    expect(this.slackbot.robot.brain.data.users).to.eql({});
  });
});

describe('Send Messages', function() {
  it('Should send a message', function() {
    this.slackbot.send({
      room: this.stubs.channel.id
    }, 'message');
    expect(this.stubs._sendCount).to.eql(1);
    expect(this.stubs._msg).to.eql('message');
  });
  it('Should send multiple messages', function() {
    this.slackbot.send({
      room: this.stubs.channel.id
    }, 'one', 'two', 'three');
    expect(this.stubs._sendCount).to.eql(3);
  });
  it('Should not send empty messages', function() {
    this.slackbot.send({
      room: this.stubs.channel.id
    }, 'Hello', '', '', 'world!');
    expect(this.stubs._sendCount).to.eql(2);
  });
  it('Should not fail for inexistant user', function() {
    expect(() => {
      this.slackbot.send({
        room: 'U987'
      }, 'Hello');
    }).to.not.throw();
  });
  it('Should open a DM channel if needed', function() {
    const msg = 'Test';
    this.slackbot.send({
      room: this.stubs.user.id
    }, msg);
    expect(this.stubs._dmmsg).to.eql(msg);
  });
  it('Should send a message to a user', function() {
    this.slackbot.send(this.stubs.user, 'message');
    expect(this.stubs._dmmsg).eql('message');
    expect(this.stubs._room).eql(this.stubs.user.id);
  });
  it('Should send a message with a callback', function(done) {
    this.slackbot.send({
      room: this.stubs.channel.id
    }, 'message', done);
    expect(this.stubs._sendCount).eql(1);
    expect(this.stubs._msg).eql('message');
  });
});

describe('Client sending message', function() {
  it('Should append as_user = true', function() {
    this.client.send({
      room: this.stubs.channel.id
    }, {
      text: 'foo',
      user: this.stubs.user,
      channel: this.stubs.channel.id
    });
    expect(this.stubs._opts.as_user).be.true;
  });
  it('Should append as_user = true only as a default', function() {
    this.client.send({
      room: this.stubs.channel.id
    }, {
      text: 'foo',
      user: this.stubs.user,
      channel: this.stubs.channel.id,
      as_user: false
    });
    expect(this.stubs._opts.as_user).eql(false);
  });
});

describe('Reply to Messages', function() {
  it('Should mention the user in a reply sent in a channel', function() {
    this.slackbot.reply({
      user: this.stubs.user,
      room: this.stubs.channel.id
    }, 'message');
    expect(this.stubs._sendCount).eql(1);
    expect(this.stubs._msg).eql(`<@${this.stubs.user.id}>: message`);
  });
  it('Should mention the user in multiple replies sent in a channel', function() {
    this.slackbot.reply({
      user: this.stubs.user,
      room: this.stubs.channel.id
    }, 'one', 'two', 'three');
    expect(this.stubs._sendCount).eql(3);
    expect(this.stubs._msg).eql(`<@${this.stubs.user.id}>: three`);
  });
  it('Should send nothing if messages are empty', function() {
    this.slackbot.reply({
      user: this.stubs.user,
      room: this.stubs.channel.id
    }, '');
    expect(this.stubs._sendCount).eql(0);
  });
  it('Should NOT mention the user in a reply sent in a DM', function() {
    this.slackbot.reply({
      user: this.stubs.user,
      room: this.stubs.DM.id
    }, 'message');
    expect(this.stubs._sendCount).eql(1);
    expect(this.stubs._dmmsg).eql("message");
  });
  it('Should call the callback', function(done) {
    this.slackbot.reply({
      user: this.stubs.user,
      room: this.stubs.channel.id
    }, 'message', done);
    expect(this.stubs._sendCount).eql(1);
    expect(this.stubs._msg).eql(`<@${this.stubs.user.id}>: message`);
  });
});

describe('Setting the channel topic', function() {
  it('Should set the topic in channels', function(done) {
    this.stubs.receiveMock.onTopic = function(topic) {
      expect(topic).eql('channel');
      done();
    };
    this.slackbot.setTopic({
      room: this.stubs.channel.id
    }, 'channel');
  });
  it('Should NOT set the topic in DMs', function() {
    this.slackbot.setTopic({
      room: 'D1232'
    }, 'DM');
    expect(this.stubs._topic).to.be.undefined;
  });
});

describe('Receiving an error event', function() {
  it('Should propagate that error', function() {
    this.hit = false;
    this.slackbot.robot.on('error', (error) => {
      expect(error.msg).eql('ohno');
      this.hit = true;
    });
    expect(this.hit).to.be.false;
    this.slackbot.error({
      msg: 'ohno',
      code: -2
    });
    expect(this.hit).to.be.true;
  });
  it('Should handle rate limit errors', function() {
    const { logger } = this.slackbot.robot;
    this.slackbot.error({
      msg: 'ratelimit',
      code: -1
    });
    expect(logger.logs["error"].length).be.greaterThan(0);
  });
});

describe('Handling incoming messages', function() {
  it('Should handle regular messages as hoped and dreamed', function(done) {
    this.stubs.receiveMock.onReceived = function(msg) {
      expect(msg.text).eql('foo');
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      text: 'foo',
      user: this.stubs.user,
      channel: this.stubs.channel.id
    });
  });
  it('Should handle broadcasted messages', function(done) {
    this.stubs.receiveMock.onReceived = function(msg) {
      expect(msg.text).eql('foo');
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      text: 'foo',
      subtype: 'thread_broadcast',
      user: this.stubs.user,
      channel: this.stubs.channel.id
    });
  });
  it('Should prepend our name to a name-lacking message addressed to us in a DM', function(done) {
    const bot_name = this.slackbot.robot.name;
    this.stubs.receiveMock.onReceived = function(msg) {
      expect(msg.text).eql(`${bot_name} foo`);
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      text: "foo",
      user: this.stubs.user,
      channel: this.stubs.DM.id
    });
  });
  it('Should NOT prepend our name to a name-containing message addressed to us in a DM', function(done) {
    const bot_name = this.slackbot.robot.name;
    this.stubs.receiveMock.onReceived = function(msg) {
      expect(msg.text).eql(`${bot_name} foo`);
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      text: `${bot_name} foo`,
      user: this.stubs.user,
      channel: this.stubs.DM.id
    });
  });
  it('Should a message object with raw text and message', function(done) {
    //the shape of this data is an RTM message event passed through SlackClient#messageWrapper
    //see: https://api.slack.com/events/message
    const messageData = {
      type: 'message',
      user: this.stubs.user,
      channel: this.stubs.channel.id,
      text: 'foo <http://www.example.com> bar'
    };
    this.stubs.receiveMock.onReceived = function(msg) {
      expect(msg instanceof SlackTextMessage).to.be.true;
      expect(msg.text).to.eql("foo http://www.example.com bar");
      expect(msg.rawText).to.eql("foo <http://www.example.com> bar");
      expect(msg.rawMessage).to.eql(messageData);
      done();
    };
    this.slackbot.eventHandler(messageData);
  });
  it('Should handle member_joined_channel events as envisioned', function() {
    this.slackbot.eventHandler({
      type: 'member_joined_channel',
      user: this.stubs.user,
      channel: this.stubs.channel.id,
      ts: this.stubs.event_timestamp
    });
    expect(this.stubs._received.constructor.name).to.eql("EnterMessage");
    expect(this.stubs._received.ts).to.eql(this.stubs.event_timestamp);
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
  });
  it('Should handle member_left_channel events as envisioned', function() {
    this.slackbot.eventHandler({
      type: 'member_left_channel',
      user: this.stubs.user,
      channel: this.stubs.channel.id,
      ts: this.stubs.event_timestamp
    });
    expect(this.stubs._received.constructor.name).to.eql("LeaveMessage");
    expect(this.stubs._received.ts).to.eql(this.stubs.event_timestamp);
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
  });
  it('Should handle channel_topic events as envisioned', function() {
    this.slackbot.eventHandler({
      type: 'message',
      subtype: 'channel_topic',
      user: this.stubs.user,
      channel: this.stubs.channel.id
    });
    expect(this.stubs._received.constructor.name).to.eql("TopicMessage");
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
  });
  it('Should handle group_topic events as envisioned', function() {
    this.slackbot.eventHandler({
      type: 'message',
      subtype: 'group_topic',
      user: this.stubs.user,
      channel: this.stubs.channel.id
    });
    expect(this.stubs._received.constructor.name).to.eql("TopicMessage");
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
  });
  it('Should handle reaction_added events as envisioned', function() {
    const reactionMessage = {
      type: 'reaction_added',
      user: this.stubs.user,
      item_user: this.stubs.self,
      item: {
        type: 'message',
        channel: this.stubs.channel.id,
        ts: '1360782804.083113'
      },
      reaction: 'thumbsup',
      event_ts: '1360782804.083113'
    };
    this.slackbot.eventHandler(reactionMessage);
    expect(this.stubs._received instanceof ReactionMessage).to.be.true;
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
    expect(this.stubs._received.user.room).to.eql(this.stubs.channel.id);
    expect(this.stubs._received.item_user.id).to.eql(this.stubs.self.id);
    expect(this.stubs._received.type).to.eql('added');
    expect(this.stubs._received.reaction).to.eql('thumbsup');
  });
  it('Should handle reaction_removed events as envisioned', function() {
    const reactionMessage = {
      type: 'reaction_removed',
      user: this.stubs.user,
      item_user: this.stubs.self,
      item: {
        type: 'message',
        channel: this.stubs.channel.id,
        ts: '1360782804.083113'
      },
      reaction: 'thumbsup',
      event_ts: '1360782804.083113'
    };
    this.slackbot.eventHandler(reactionMessage);
    expect(this.stubs._received instanceof ReactionMessage).to.be.true;
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
    expect(this.stubs._received.user.room).to.eql(this.stubs.channel.id);
    expect(this.stubs._received.item_user.id).to.eql(this.stubs.self.id);
    expect(this.stubs._received.type).to.eql('removed');
    expect(this.stubs._received.reaction).to.eql('thumbsup');
  });
  it('Should not crash with bot messages', function(done) {
    this.stubs.receiveMock.onReceived = msg => {
      expect(msg instanceof SlackTextMessage).to.be.true;
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      subtype: 'bot_message',
      user: this.stubs.user,
      channel: this.stubs.channel.id,
      text: 'Pushing is the answer',
      returnRawText: true
    });
  });
  it('Should handle single user presence_change events as envisioned', function() {
    this.slackbot.robot.brain.userForId(this.stubs.user.id, this.stubs.user);
    const presenceMessage = {
      type: 'presence_change',
      user: this.stubs.user,
      presence: 'away'
    };
    this.slackbot.eventHandler(presenceMessage);
    expect(this.stubs._received instanceof PresenceMessage).to.be.true;
    expect(this.stubs._received.users[0].id).to.eql(this.stubs.user.id);
    expect(this.stubs._received.users.length).to.eql(1);
  });
  it('Should handle presence_change events as envisioned', function() {
    this.slackbot.robot.brain.userForId(this.stubs.user.id, this.stubs.user);
    const presenceMessage = {
      type: 'presence_change',
      users: [this.stubs.user.id],
      presence: 'away'
    };
    this.slackbot.eventHandler(presenceMessage);
    expect(this.stubs._received instanceof PresenceMessage).to.be.true;
    expect(this.stubs._received.users[0].id).to.eql(this.stubs.user.id);
    expect(this.stubs._received.users.length).to.eql(1);
  });
  it('Should ignore messages it sent itself', function() {
    this.slackbot.eventHandler({
      type: 'message',
      subtype: 'bot_message',
      user: this.stubs.self,
      channel: this.stubs.channel.id,
      text: 'Ignore me'
    });
    expect(this.stubs._received).to.be.undefined;
  });
  it('Should ignore reaction events that it generated itself', function() {
    const reactionMessage = {
      type: 'reaction_removed',
      user: this.stubs.self,
      reaction: 'thumbsup',
      event_ts: '1360782804.083113'
    };
    this.slackbot.eventHandler(reactionMessage);
    expect(this.stubs._received).to.be.undefined;
  });
  it('Should handle empty users as envisioned', function(done) {
    this.stubs.receiveMock.onReceived = msg => {
      expect(msg instanceof SlackTextMessage).to.be.true;
      done();
    };
    this.slackbot.eventHandler({
      type: 'message',
      subtype: 'bot_message',
      user: {},
      channel: this.stubs.channel.id,
      text: 'Foo'
    });
  });
  it('Should handle reaction events from users who are in different workspace in shared channel', function() {
    const reactionMessage = {
      type: 'reaction_added',
      user: this.stubs.org_user_not_in_workspace_in_channel,
      item_user: this.stubs.self,
      item: {
        type: 'message',
        channel: this.stubs.channel.id,
        ts: '1360782804.083113'
      },
      reaction: 'thumbsup',
      event_ts: '1360782804.083113'
    };
    this.slackbot.eventHandler(reactionMessage);
    expect(this.stubs._received instanceof ReactionMessage).to.be.true;
    expect(this.stubs._received.user.id).to.eql(this.stubs.org_user_not_in_workspace_in_channel.id);
    expect(this.stubs._received.user.room).to.eql(this.stubs.channel.id);
    expect(this.stubs._received.item_user.id).to.eql(this.stubs.self.id);
    expect(this.stubs._received.type).to.eql('added');
    expect(this.stubs._received.reaction).to.eql('thumbsup');
  });
  it('Should handle file_shared events as envisioned', function() {
    const fileMessage = {
      type: 'file_shared',
      user: this.stubs.user,
      file_id: 'F2147483862',
      event_ts: '1360782804.083113'
    };
    this.slackbot.eventHandler(fileMessage);
    expect(this.stubs._received instanceof FileSharedMessage).to.be.true;
    expect(this.stubs._received.user.id).to.eql(this.stubs.user.id);
    expect(this.stubs._received.file_id).to.eql('F2147483862');
  });
});

describe('Robot.react DEPRECATED', function() {
  before(function() {
    const user = {
      id: this.stubs.user.id,
      room: this.stubs.channel.id
    };
    const item = {
      type: 'message',
      channel: this.stubs.channel.id,
      ts: '1360782804.083113'
    };
    this.reactionMessage = new ReactionMessage('reaction_added', user, 'thumbsup', item, '1360782804.083113');
    this.handleReaction = msg => `${msg.reaction} handled`;
  });
  it('Should register a Listener with callback only', function() {
    this.slackbot.robot.react(this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({
      id: null
    });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with opts and callback', function() {
    this.slackbot.robot.react({
      id: 'foobar'
    }, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({
      id: 'foobar'
    });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with matcher and callback', function() {
    const matcher = msg => msg.type === 'added';
    this.slackbot.robot.react(matcher, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({
      id: null
    });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with matcher, opts, and callback', function() {
    const matcher = msg => msg.type === 'removed' || msg.reaction === 'thumbsup';
    this.slackbot.robot.react(matcher, {
      id: 'foobar'
    }, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({
      id: 'foobar'
    });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener that does not match the ReactionMessage', function() {
    const matcher = msg => msg.type === 'removed';
    this.slackbot.robot.react(matcher, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.false;
  });
});

describe('Robot.fileShared', function() {
  before(function() {
    const user = {
      id: this.stubs.user.id,
      room: this.stubs.channel.id
    };
    this.fileSharedMessage = new FileSharedMessage(user, "F2147483862", '1360782804.083113');
    this.handleFileShared = msg =>`${msg.file_id} shared`;
  });
  it('Should register a Listener with callback only', function() {
    this.slackbot.robot.fileShared(this.handleFileShared);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.fileSharedMessage)).to.be.true;
    expect(listener.options).to.eql({ id: null });
    expect(listener.callback(this.fileSharedMessage)).to.eql('F2147483862 shared');
  });
  it('Should register a Listener with opts and callback', function() {
    this.slackbot.robot.fileShared({ id: 'foobar' }, this.handleFileShared);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.fileSharedMessage)).to.be.true;
    expect(listener.options).to.eql({ id: 'foobar' });
    expect(listener.callback(this.fileSharedMessage)).to.eql('F2147483862 shared');
  });
  it('Should register a Listener with matcher and callback', function() {
    const matcher = msg => msg.file_id === 'F2147483862';
    this.slackbot.robot.fileShared(matcher, this.handleFileShared);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.fileSharedMessage)).to.be.true;
    expect(listener.options).to.eql({
      id: null
    });
    expect(listener.callback(this.fileSharedMessage)).to.eql('F2147483862 shared');
  });
  it('Should register a Listener with matcher, opts, and callback', function() {
    const matcher = msg => msg.file_id === 'F2147483862';
    this.slackbot.robot.fileShared(matcher, { id: 'foobar' }, this.handleFileShared);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.fileSharedMessage)).to.be.true;
    expect(listener.options).to.eql({ id: 'foobar' });
    expect(listener.callback(this.fileSharedMessage)).to.eql('F2147483862 shared');
  });
  it('Should register a Listener that does not match the ReactionMessage', function() {
    const matcher = msg => msg.file_id === 'J12387ALDFK';
    this.slackbot.robot.fileShared(matcher, this.handleFileShared);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.fileSharedMessage)).to.be.false;
  });
});

describe('Robot.hearReaction', function() {
  before(function() {
    const user = {
      id: this.stubs.user.id,
      room: this.stubs.channel.id
    };
    const item = {
      type: 'message',
      channel: this.stubs.channel.id,
      ts: '1360782804.083113'
    };
    this.reactionMessage = new ReactionMessage('reaction_added', user, 'thumbsup', item, '1360782804.083113');
    this.handleReaction = msg => `${msg.reaction} handled`;
  });
  it('Should register a Listener with callback only', function() {
    this.slackbot.robot.hearReaction(this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({ id: null });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with opts and callback', function() {
    this.slackbot.robot.hearReaction({ id: 'foobar' }, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({ id: 'foobar' });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with matcher and callback', function() {
    const matcher = msg => msg.type === 'added';
    this.slackbot.robot.hearReaction(matcher, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({ id: null });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener with matcher, opts, and callback', function() {
    const matcher = msg => msg.type === 'removed' || msg.reaction === 'thumbsup';
    this.slackbot.robot.hearReaction(matcher, { id: 'foobar' }, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.true;
    expect(listener.options).to.eql({ id: 'foobar' });
    expect(listener.callback(this.reactionMessage)).to.eql('thumbsup handled');
  });
  it('Should register a Listener that does not match the ReactionMessage', function() {
    const matcher = msg => msg.type === 'removed';
    this.slackbot.robot.hearReaction(matcher, this.handleReaction);
    const listener = this.slackbot.robot.listeners.shift();
    expect(listener.matcher(this.reactionMessage)).to.be.false;
  });
});

describe('Users data', function() {
  it('Should load users data from web api', function() {
    this.slackbot.usersLoaded(null, this.stubs.responseUsersList);
    const user = this.slackbot.robot.brain.data.users[this.stubs.user.id];
    expect(user.id).to.eql(this.stubs.user.id);
    expect(user.name).to.eql(this.stubs.user.name);
    expect(user.real_name).to.eql(this.stubs.user.real_name);
    expect(user.email_address).to.eql(this.stubs.user.profile.email);
    expect(user.slack.misc).to.eql(this.stubs.user.misc);
    const userperiod = this.slackbot.robot.brain.data.users[this.stubs.userperiod.id];
    expect(userperiod.id).to.eql(this.stubs.userperiod.id);
    expect(userperiod.name).to.eql(this.stubs.userperiod.name);
    expect(userperiod.real_name).to.eql(this.stubs.userperiod.real_name);
    expect(userperiod.email_address).to.eql(this.stubs.userperiod.profile.email);
  });
  it('Should merge with user data which is stored by other program', function() {
    const originalUser = { something: 'something' };
    this.slackbot.robot.brain.userForId(this.stubs.user.id, originalUser);
    this.slackbot.usersLoaded(null, this.stubs.responseUsersList);
    const user = this.slackbot.robot.brain.data.users[this.stubs.user.id];
    expect(user.id).to.eql(this.stubs.user.id);
    expect(user.name).to.eql(this.stubs.user.name);
    expect(user.real_name).to.eql(this.stubs.user.real_name);
    expect(user.email_address).to.eql(this.stubs.user.profile.email);
    expect(user.slack.misc).to.eql(this.stubs.user.misc);
    expect(user.something).to.eql(originalUser.something);
  });
  it('Should detect wrong response from web api', function() {
    this.slackbot.usersLoaded(null, this.stubs.wrongResponseUsersList);
    expect(this.slackbot.robot.brain.data.users[this.stubs.user.id]).to.be.undefined;
  });
});
