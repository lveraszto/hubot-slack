'use strict';

import SlackMention from '../src/mention.mjs';

describe('buildText()', function() {
  it('Should decode entities', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo &gt; &amp; &lt; &gt;&amp;&lt;';
    return message.buildText(this.client, () => expect(message.text).eql('foo > & < >&<'));
  });
  it('Should remove formatting around <http> links', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <http://www.example.com> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo http://www.example.com bar'));
  });
  it('Should remove formatting around <https> links', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo https://www.example.com bar'));
  });
  it('Should remove formatting around <skype> links', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <skype:echo123?call> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo skype:echo123?call bar'));
  });
  it('Should remove formatting around <https> links with a label', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|label> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo label (https://www.example.com) bar'));
  });
  it('Should remove formatting around <https> links with a substring label', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|example.com> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo https://www.example.com bar'))
  });
  it('Should remove formatting around <https> links with a label containing entities', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <https://www.example.com|label &gt; &amp; &lt;> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo label > & < (https://www.example.com) bar'));
  });
  it('Should remove formatting around <mailto> links', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <mailto:name@example.com> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo name@example.com bar'));
  });
  it('Should remove formatting around <mailto> links with an email label', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <mailto:name@example.com|name@example.com> bar';
    return message.buildText(this.client, () => expect(message.text).eql('foo name@example.com bar'));
  });
  it('Should handle empty text with attachments', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = null;
    message.rawMessage.attachments = [{ fallback: 'first' }];
    return message.buildText(this.client, () => expect(message.text).eql('\nfirst'));
  });
  it('Should handle an empty set of attachments', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo';
    message.rawMessage.attachments = [];
    return message.buildText(this.client, () => expect(message.text).eql('foo'));
  });
  it('Should change multiple links at once', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123|label> bar <#C123> <!channel> <https://www.example.com|label>';
    return message.buildText(this.client, () => expect(message.text).eql('foo @label bar #general @channel label (https://www.example.com)'));
  });
  it('Should populate mentions with simple SlackMention object', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar';
    return message.buildText(this.client, function() {
      expect(message.mentions.length).eql(1);
      expect(message.mentions[0].type).eql('user');
      expect(message.mentions[0].id).eql('U123');
      expect(message.mentions[0]).instanceOf(SlackMention);
    });
  });
  it('Should populate mentions with simple SlackMention object with label', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123|label> bar';
    return message.buildText(this.client, function() {
      expect(message.mentions.length).eql(1);
      expect(message.mentions[0].type).eql('user');
      expect(message.mentions[0].id).eql('U123');
      expect(message.mentions[0].info).to.be.undefined;
      expect(message.mentions[0]).instanceOf(SlackMention);
    });
  });
  it('Should populate mentions with multiple SlackMention objects', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar <#C123> baz <@U123|label> qux';
    return message.buildText(this.client, function() {
      expect(message.mentions.length).eql(3);
      expect(message.mentions[0]).instanceOf(SlackMention);
      expect(message.mentions[1]).instanceOf(SlackMention);
      expect(message.mentions[2]).instanceOf(SlackMention);
    });
  });
  it('Should populate mentions with simple SlackMention object if user in brain', function() {
    this.client.updateUserInBrain(this.stubs.user);
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo <@U123> bar';
    return message.buildText(this.client, function() {
      expect(message.mentions.length).eql(1);
      expect(message.mentions[0].type).eql('user');
      expect(message.mentions[0].id).eql('U123');
      expect(message.mentions[0]).instanceOf(SlackMention);
    });
  });
  it('Should add conversation to cache', function() {
    const message = this.slacktextmessage;
    const client = this.client;
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      expect(message.text).eql('foo bar');
      expect(client.channelData).have.key('C123');
    });
  });
  it('Should not modify conversation if it is not expired', function() {
    const message = this.slacktextmessage;
    const client = this.client;
    client.channelData[this.stubs.channel.id] = {
      channel: { id: this.stubs.channel.id, name: 'baz' },
      updated: Date.now()
    };
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      expect(message.text).eql('foo bar');
      expect(client.channelData).have.key('C123');
      expect(client.channelData['C123'].channel.name).eql('baz');
    });
  });
  it('Should handle conversation errors', function() {
    const message = this.slacktextmessage_invalid_conversation;
    const client = this.client;
    message.rawMessage.text = 'foo bar';
    return message.buildText(this.client, function() {
      const ref = client.robot.logger.logs;
      if (ref) {
        expect(ref.error.length).eql(1)
      }
    });
  });
  it('Should flatten attachments', function() {
    const message = this.slacktextmessage;
    message.rawMessage.text = 'foo bar';
    message.rawMessage.attachments = [{ fallback: 'first' }, { fallback: 'second' }];
    return message.buildText(this.client, () => expect(message.text).eql('foo bar\nfirst\nsecond'));
  });
});

describe('replaceLinks()', function() {
  it('Should change <@U123> links to @name', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U123> bar').then(text => expect(text).eql('foo @name bar'));
  });
  it('Should change <@U123|label> links to @label', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U123|label> bar').then(text => expect(text).eql('foo @label bar'));
  });
  it('Should handle invalid User ID gracefully', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U555> bar').then(text => expect(text).eql('foo <@U555> bar'));
  });
  it('Should handle empty User API response', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <@U789> bar').then(text => expect(text).eql('foo <@U789> bar'));
  });
  it('Should change <#C123> links to #general', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C123> bar').then(text => expect(text).eql('foo #general bar'));
  });
  it('Should change <#C123|label> links to #label', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C123|label> bar').then(text => expect(text).eql('foo #label bar'));
  });
  it('Should handle invalid Conversation ID gracefully', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C555> bar').then(text => expect(text).eql('foo <#C555> bar'));
  });
  it('Should handle empty Conversation API response', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <#C789> bar').then(text => expect(text).eql('foo <#C789> bar'));
  });
  it('Should change <!everyone> links to @everyone', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!everyone> bar').then(text => expect(text).eql('foo @everyone bar'));
  });
  it('Should change <!channel> links to @channel', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!channel> bar').then(text => expect(text).eql('foo @channel bar'));
  });
  it('Should change <!group> links to @group', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!group> bar').then(text => expect(text).eql('foo @group bar'));
  });
  it('Should change <!here> links to @here', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!here> bar').then(text => expect(text).eql('foo @here bar'));
  });
  it('Should change <!subteam^S123|@subteam> links to @subteam', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!subteam^S123|@subteam> bar').then(text => expect(text).eql('foo @subteam bar'));
  });
  it('Should change <!foobar|hello> links to hello', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!foobar|hello> bar').then(text => expect(text).eql('foo hello bar'));
  });
  it('Should leave <!foobar> links as-is when no label is provided', function() {
    return this.slacktextmessage.replaceLinks(this.client, 'foo <!foobar> bar').then(text => expect(text).eql('foo <!foobar> bar'));
  });
});
