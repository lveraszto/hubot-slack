'use strict';

require('./stubs');
const SlackClient = require('../src/client');
const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

describe('Init', function() {
  it('Should initialize with an RTM client', function() {
    expect(this.client.rtm).instanceof(RTMClient);
    expect(this.client.rtm.webClient.token).to.eql('xoxb-faketoken');
  });
  it('Should initialize with a Web client', function() {
    expect(this.client.web).instanceof(WebClient);
    expect(this.client.web.token).to.eql('xoxb-faketoken');
  });
});

describe('connect()', function() {
  it('Should be able to connect', function() {
    this.client.connect();
    expect(this.stubs._connected).to.be.true;
  });
});

describe('onEvent()', function() {
  it('should not need to be set', function() {
    this.client.rtm.emit('message', { fake: 'message' });
    expect(true).to.be.ok;
  });
  it('should emit pre-processed messages to the callback', function(done) {
    this.client.onEvent(message => {
      expect(message).to.be.ok;
      expect(message.user.real_name).to.eql(this.stubs.user.real_name);
      expect(message.channel).to.eql(this.stubs.channel.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    // the shape of the following object is a raw RTM message event: https://api.slack.com/events/message
    this.client.rtm.emit('message', {
      type: 'message',
      user: this.stubs.user.id,
      channel: this.stubs.channel.id,
      text: 'blah',
      ts: '1355517523.000005'
    });
  });
  it('should successfully convert bot users', function(done) {
    this.client.onEvent(message => {
      expect(message).to.be.ok;
      expect(message.user.id).to.eql(this.stubs.user.id);
      expect(message.channel).to.eql(this.stubs.channel.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    // the shape of the following object is a raw RTM message event: https://api.slack.com/events/message
    this.client.rtm.emit('message', {
      type: 'message',
      bot_id: 'B123',
      channel: this.stubs.channel.id,
      text: 'blah'
    });
  });
  it('should handle undefined bot users', function(done) {
    this.client.onEvent((message) => {
      expect(message).to.be.ok;
      expect(message.channel).to.eql(this.stubs.channel.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    this.client.rtm.emit('message', {
      type: 'message',
      bot_id: 'B789',
      channel: this.stubs.channel.id,
      text: 'blah'
    });
  });
  it('should handle undefined users as envisioned', function(done) {
    this.client.onEvent((message) => {
      expect(message).to.be.ok;
      expect(message.channel).to.eql(this.stubs.channel.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    this.client.rtm.emit('message', {
      type: 'message',
      user: void 0,
      channel: this.stubs.channel.id,
      text: 'eat more veggies'
    });
  });
  it('should update bot id to user representation map', function(done) {
    this.client.onEvent((message) => {
      expect(message).to.be.ok;
      expect(this.client.botUserIdMap[this.stubs.bot.id].id).to.eql(this.stubs.user.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });

    // the shape of the following object is a raw RTM message event: https://api.slack.com/events/message
    this.client.rtm.emit('message', {
      type: 'message',
      bot_id: this.stubs.bot.id,
      channel: this.stubs.channel.id,
      text: 'blah'
    });
  });
  it('should use user representation for bot id in map', function(done) {
    this.client.onEvent((message) => {
      expect(message).be.ok;
      expect(message.user.id).to.eql(this.stubs.user.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    this.client.botUserIdMap[this.stubs.bot.id] = this.stubs.user;
    // the shape of the following object is a raw RTM message event: https://api.slack.com/events/message
    this.client.rtm.emit('message', {
      type: 'message',
      bot_id: this.stubs.bot.id,
      channel: this.stubs.channel.id,
      text: 'blah'
    });
  });
  it('should log an error when expanded info cannot be fetched using the Web API', function(done) {
    // NOTE: to be certain nothing goes wrong in the rejection handling, the "unhandledRejection" / "rejectionHandled"
    // global events need to be instrumented
    this.client.onEvent(function(message) {
      return done(new Error('A message was emitted'));
    });
    this.client.rtm.emit('message', {
      type: 'message',
      user: 'NOT A USER',
      channel: this.stubs.channel.id,
      text: 'blah',
      ts: '1355517523.000005'
    });
    return setImmediate(() => {
      const ref = this.stubs.robot.logger.logs;
      if (ref) {
        expect(ref.error.length).to.eql(1);
      }
      return done();
    });
  });
  it('should use user instead of bot_id', function(done) {
    this.client.onEvent((message) => {
      expect(message).be.ok;
      expect(message.user.id).eql(this.stubs.user.id);
      expect(this.stubs.robot.logger.logs).not.have.property('error');
      return done();
    });
    this.client.botUserIdMap[this.stubs.bot.id] = this.stubs.userperiod;
    this.client.rtm.emit('message', {
      type: 'message',
      bot_id: this.stubs.bot.id,
      user: this.stubs.user.id,
      channel: this.stubs.channel.id,
      text: 'blah'
    });
  });
});

describe('on() - DEPRECATED', function() {
  it('Should register events on the RTM stream', function() {
    let event = null;
    this.client.on('some_event', e => event = e);
    this.client.rtm.emit('some_event', {});
    expect(event).be.ok;
  });
});

describe('disconnect()', function() {
  it('Should disconnect RTM', function() {
    this.client.disconnect();
    expect(this.stubs._connected).to.be.false;
  });
  it('should remove all RTM listeners - LEGACY', function() {
    this.client.on('some_event', () => undefined);
    this.client.disconnect();
    expect(this.client.rtm.listeners('some_event', true)).to.eql([]);
  });
});

describe('setTopic()', function() {
  it("Should set the topic in a channel", function(done) {
    this.client.setTopic(this.stubs.channel.id, 'iAmTopic');
    return setImmediate(() => {
      expect(this.stubs._topic).to.eql('iAmTopic');
      return done();
    });
  });
  it("should not set the topic in a DM", function(done) {
    this.client.setTopic(this.stubs.DM.id, 'iAmTopic');
    return setTimeout(() => {
      expect(this.stubs).not.have.property('_topic');
      // NOTE: no good way to assert that debug log was output
      return done();
    }, 0);
  });
  it("should not set the topic in a MPIM", function(done) {
    this.client.setTopic(this.stubs.group.id, 'iAmTopic');
    return setTimeout(() => {
      expect(this.stubs).not.have.property('_topic');
      // NOTE: no good way to assert that debug log was output
      return done();
    }, 0);
  });
  it("should log an error if the setTopic web API method fails", function(done) {
    this.client.setTopic('NOT A CONVERSATION', 'iAmTopic');
    return setTimeout(() => {
      expect(this.stubs).not.have.property('_topic');
      const ref = this.stubs.robot.logger.logs;
      if (ref) {
        expect(ref.error.length).to.eql(1);
      }
      return done();
    }, 0);
  });
});

describe('send()', function() {
  it('Should send a plain string message to room', function() {
    this.client.send({
      room: 'room1'
    }, 'Message');
    expect(this.stubs._msg).eql('Message');
    expect(this.stubs._room).eql('room1');
  });
  it('Should send an object message to room', function() {
    this.client.send({ room: 'room2' }, { text: 'textMessage' });
    expect(this.stubs._msg).eql('textMessage');
    expect(this.stubs._room).eql('room2');
  });
  it('Should be able to send a DM to a user object', function() {
    this.client.send(this.stubs.user, 'DM Message');
    expect(this.stubs._dmmsg).eql('DM Message');
    expect(this.stubs._room).eql(this.stubs.user.id);
  });
  it('should not send a message to a user without an ID', function() {
    this.client.send({ name: "my_crufty_username" }, "don't program with usernames");
    expect(this.stubs._sendCount).eql(0);
  });
  it('should log an error when chat.postMessage fails (plain string)', function(done) {
    this.client.send({ room: this.stubs.channelWillFailChatPost }, "Message");
    expect(this.stubs._sendCount).eql(0);
    return setImmediate((() => {
      const ref = this.stubs.robot.logger.logs;
      if (ref) {
        expect(ref.error.length).eql(1);
      }
      return done();
    }));
  });
  it('should log an error when chat.postMessage fails (object)', function(done) {
    this.client.send({ room: this.stubs.channelWillFailChatPost }, { text: "textMessage" });
    expect(this.stubs._sendCount).eql(0);
    return setImmediate((() => {
      const ref = this.stubs.robot.logger.logs;
      if (ref) {
        expect(ref.error.length).eql(1);
      }
      return done();
    }));
  });
});

describe('loadUsers()', function() {
  it('should make successive calls to users.list', function() {
    this.client.loadUsers((err, result) => {
      expect(this.stubs._listCount).eql(2);
      expect(result.members.length).eql(4);
    });
  });
  it('should handle errors', function() {
    this.stubs._listError = true;
    this.client.loadUsers(err => expect(err).be.throw);
  });
});

describe('Users data', function() {
  it('Should add a user data', function() {
    this.client.updateUserInBrain(this.stubs.user);
    const user = this.slackbot.robot.brain.data.users[this.stubs.user.id];
    expect(user.id).to.eql(this.stubs.user.id);
    expect(user.name).to.eql(this.stubs.user.name);
    expect(user.real_name).to.eql(this.stubs.user.real_name);
    expect(user.email_address).to.eql(this.stubs.user.profile.email);
    expect(user.slack.misc).to.eql(this.stubs.user.misc);
  });
  it('Should add a user data (user with no profile)', function() {
    this.client.updateUserInBrain(this.stubs.usernoprofile);
    const user = this.slackbot.robot.brain.data.users[this.stubs.usernoprofile.id];
    expect(user.id).to.eql(this.stubs.usernoprofile.id);
    expect(user.name).to.eql(this.stubs.usernoprofile.name);
    expect(user.real_name).to.eql(this.stubs.usernoprofile.real_name);
    expect(user.slack.misc).to.eql(this.stubs.usernoprofile.misc);
    expect(user).not.have.ownProperty('email_address');
  });
  it('Should add a user data (user with no email in profile)', function() {
    this.client.updateUserInBrain(this.stubs.usernoemail);
    const user = this.slackbot.robot.brain.data.users[this.stubs.usernoemail.id];
    expect(user.id).to.eql(this.stubs.usernoemail.id);
    expect(user.name).to.eql(this.stubs.usernoemail.name);
    expect(user.real_name).to.eql(this.stubs.usernoemail.real_name);
    expect(user.slack.misc).to.eql(this.stubs.usernoemail.misc);
    expect(user).not.have.ownProperty('email_address');
  });
  it('Should modify a user data', function() {
    this.client.updateUserInBrain(this.stubs.user);
    let user = this.slackbot.robot.brain.data.users[this.stubs.user.id];
    expect(user.id).to.eql(this.stubs.user.id);
    expect(user.name).to.eql(this.stubs.user.name);
    expect(user.real_name).to.eql(this.stubs.user.real_name);
    expect(user.email_address).to.eql(this.stubs.user.profile.email);
    expect(user.slack.misc).to.eql(this.stubs.user.misc);
    const client = new SlackClient({ token: 'xoxb-faketoken' }, this.stubs.robot);
    const user_change_event = {
      type: 'user_change',
      user: {
        id: this.stubs.user.id,
        name: 'modified_name',
        real_name: this.stubs.user.real_name,
        profile: {
          email: this.stubs.user.profile.email
        }
      }
    };
    this.client.updateUserInBrain(user_change_event);
    user = this.slackbot.robot.brain.data.users[this.stubs.user.id];
    expect(user.id).to.eql(this.stubs.user.id);
    expect(user.name).to.eql(user_change_event.user.name);
    expect(user.real_name).to.eql(this.stubs.user.real_name);
    expect(user.email_address).to.eql(this.stubs.user.profile.email);
    expect(user.slack.misc).to.be.undefined;
    expect(user.slack.client).to.be.undefined;
  });
});

describe('fetchBotUser()', function() {
  it('should return user representation from map', function() {
    const user = this.stubs.user;
    this.client.botUserIdMap[this.stubs.bot.id] = user;
    this.client.fetchBotUser(this.stubs.bot.id).then(res => expect(res.id).eql(user.id));
  });
  it('should return promise if no user representation exists in map', function() {
    const result = this.client.fetchBotUser(this.stubs.bot.id);
    expect(result).instanceof(Promise);
  });
  it('should return constant data if id is slackbots id', function() {
    const user = this.stubs.slack_bot;
    this.client.fetchBotUser(this.stubs.slack_bot.id).then(res => {
      expect(res.id).eql(user.id);
      return expect(res.user_id).eql(user.user_id);
    });
  });
});

describe('fetchUser()', function() {
  it('should return user representation from brain', function() {
    const user = this.stubs.user;
    this.client.updateUserInBrain(user);
    this.client.fetchUser(user.id).then(res => expect(res.id).eql(user.id));
  });
  it('should return promise if no user exists in brain', function() {
    const result = this.client.fetchUser(this.stubs.user.id);
    expect(result).instanceof(Promise);
  });
  it('Should sync interacting users when syncing disabled', function() {
    const slackbot = this.slackbot;
    slackbot.options.disableUserSync = true;
    slackbot.run();
    this.client.fetchUser(this.stubs.user.id).then(res=> expect(slackbot.robot.brain.data.users).have.keys('U123'));
  });
});

describe('fetchConversation()', function() {
  it('Should remove expired conversation info', function() {
    const channel = this.stubs.channel;
    const client = this.client;
    client.channelData[channel.id] = {
      channel: {
        id: 'C123',
        name: 'foo'
      },
      updated: this.stubs.expired_timestamp
    };
    client.fetchConversation(channel.id).then(res => {
      expect(res.name).eql(channel.name);
      expect(client.channelData).have.key('C123');
      return expect(client.channelData['C123'].channel.name).eql(channel.name);
    });
  });
  it('Should return conversation info if not expired', function() {
    const channel = this.stubs.channel;
    const client = this.client;
    client.channelData[channel.id] = {
      channel: {
        id: 'C123',
        name: 'foo'
      },
      updated: Date.now()
    };
    return client.fetchConversation(channel.id).then(res => {
      expect(res.id).eql(channel.id);
      expect(client.channelData).have.key('C123');
      return expect(client.channelData['C123'].channel.name).eql('foo');
    });
  });
});
