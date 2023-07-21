var SlackMention, should;

should = require('should');

SlackMention = require('../src/mention');

describe('buildText()', function() {
  it('Should decode entities', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo &gt; &amp; &lt; &gt;&amp;&lt;';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo > & < >&<');
    });
  });
  it('Should remove formatting around <http> links', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <http://www.example.com> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo http://www.example.com bar');
    });
  });
  it('Should remove formatting around <https> links', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo https://www.example.com bar');
    });
  });
  it('Should remove formatting around <skype> links', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <skype:echo123?call> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo skype:echo123?call bar');
    });
  });
  it('Should remove formatting around <https> links with a label', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|label> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo label (https://www.example.com) bar');
    });
  });
  it('Should remove formatting around <https> links with a substring label', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|example.com> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo https://www.example.com bar');
    });
  });
  it('Should remove formatting around <https> links with a label containing entities', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|label &gt; &amp; &lt;> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo label > & < (https://www.example.com) bar');
    });
  });
  it('Should remove formatting around <mailto> links', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <mailto:name@example.com> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo name@example.com bar');
    });
  });
  it('Should remove formatting around <mailto> links with an email label', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <mailto:name@example.com|name@example.com> bar';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo name@example.com bar');
    });
  });
  it('Should handle empty text with attachments', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = void 0;
    message.rawMessage.attachments = [
      {
        fallback: 'first'
      }
    ];
    return message.buildText(this.client, function() {
      return message.text.should.equal('\nfirst');
    });
  });
  it('Should handle an empty set of attachments', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo';
    message.rawMessage.attachments = [];
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo');
    });
  });
  it('Should change multiple links at once', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123|label> bar <#C123> <!channel> <https://www.example.com|label>';
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo @label bar #general @channel label (https://www.example.com)');
    });
  });
  it('Should populate mentions with simple SlackMention object', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar';
    return message.buildText(this.client, function() {
      message.mentions.length.should.equal(1);
      message.mentions[0].type.should.equal('user');
      message.mentions[0].id.should.equal('U123');
      return should.equal(message.mentions[0] instanceof SlackMention, true);
    });
  });
  it('Should populate mentions with simple SlackMention object with label', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123|label> bar';
    return message.buildText(this.client, function() {
      message.mentions.length.should.equal(1);
      message.mentions[0].type.should.equal('user');
      message.mentions[0].id.should.equal('U123');
      should.equal(message.mentions[0].info, void 0);
      return should.equal(message.mentions[0] instanceof SlackMention, true);
    });
  });
  it('Should populate mentions with multiple SlackMention objects', function() {
    var message;
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar <#C123> baz <@U123|label> qux';
    return message.buildText(this.client, function() {
      message.mentions.length.should.equal(3);
      should.equal(message.mentions[0] instanceof SlackMention, true);
      should.equal(message.mentions[1] instanceof SlackMention, true);
      return should.equal(message.mentions[2] instanceof SlackMention, true);
    });
  });
  it('Should populate mentions with simple SlackMention object if user in brain', function() {
    var message;
    this.client.updateUserInBrain(this.stubs.user);
    message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar';
    return message.buildText(this.client, function() {
      message.mentions.length.should.equal(1);
      message.mentions[0].type.should.equal('user');
      message.mentions[0].id.should.equal('U123');
      return should.equal(message.mentions[0] instanceof SlackMention, true);
    });
  });
  it('Should add conversation to cache', function() {
    var client, message;
    message = this.slacktextmessage;
    client = this.client;
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      message.text.should.equal('foo bar');
      return client.channelData.should.have.key('C123');
    });
  });
  it('Should not modify conversation if it is not expired', function() {
    var client, message;
    message = this.slacktextmessage;
    client = this.client;
    client.channelData[this.stubs.channel.id] = {
      channel: {
        id: this.stubs.channel.id,
        name: 'baz'
      },
      updated: Date.now()
    };
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      message.text.should.equal('foo bar');
      client.channelData.should.have.key('C123');
      return client.channelData['C123'].channel.name.should.equal('baz');
    });
  });
  it('Should handle conversation errors', function() {
    var client, message;
    message = this.slacktextmessage_invalid_conversation;
    client = this.client;
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      var ref;
      return (ref = client.robot.logger.logs) != null ? ref.error.length.should.equal(1) : void 0;
    });
  });
  return it('Should flatten attachments', function() {
    var client, message;
    message = this.slacktextmessage;
    client = this.client;
    message.rawMessage.text = 'foo bar';
    message.rawMessage.attachments = [
      {
        fallback: 'first'
      },
      {
        fallback: 'second'
      }
    ];
    return message.buildText(this.client, function() {
      return message.text.should.equal('foo bar\nfirst\nsecond');
    });
  });
});

describe('replaceLinks()', function() {
  it('Should change <@U123> links to @name', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U123> bar').then(function(text) {
      return text.should.equal('foo @name bar');
    });
  });
  it('Should change <@U123|label> links to @label', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U123|label> bar').then(function(text) {
      return text.should.equal('foo @label bar');
    });
  });
  it('Should handle invalid User ID gracefully', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U555> bar').then(function(text) {
      return text.should.equal('foo <@U555> bar');
    });
  });
  it('Should handle empty User API response', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U789> bar').then(function(text) {
      return text.should.equal('foo <@U789> bar');
    });
  });
  it('Should change <#C123> links to #general', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C123> bar').then(function(text) {
      return text.should.equal('foo #general bar');
    });
  });
  it('Should change <#C123|label> links to #label', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C123|label> bar').then(function(text) {
      return text.should.equal('foo #label bar');
    });
  });
  it('Should handle invalid Conversation ID gracefully', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C555> bar').then(function(text) {
      return text.should.equal('foo <#C555> bar');
    });
  });
  it('Should handle empty Conversation API response', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C789> bar').then(function(text) {
      return text.should.equal('foo <#C789> bar');
    });
  });
  it('Should change <!everyone> links to @everyone', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!everyone> bar').then(function(text) {
      return text.should.equal('foo @everyone bar');
    });
  });
  it('Should change <!channel> links to @channel', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!channel> bar').then(function(text) {
      return text.should.equal('foo @channel bar');
    });
  });
  it('Should change <!group> links to @group', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!group> bar').then(function(text) {
      return text.should.equal('foo @group bar');
    });
  });
  it('Should change <!here> links to @here', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!here> bar').then(function(text) {
      return text.should.equal('foo @here bar');
    });
  });
  it('Should change <!subteam^S123|@subteam> links to @subteam', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!subteam^S123|@subteam> bar').then(function(text) {
      return text.should.equal('foo @subteam bar');
    });
  });
  it('Should change <!foobar|hello> links to hello', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!foobar|hello> bar').then(function(text) {
      return text.should.equal('foo hello bar');
    });
  });
  return it('Should leave <!foobar> links as-is when no label is provided', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!foobar> bar').then(function(text) {
      return text.should.equal('foo <!foobar> bar');
    });
  });
});
