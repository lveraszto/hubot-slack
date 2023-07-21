'use strict';

class SlackFormatter {
  /**
   * SlackFormatter transforms raw message text into a flat string representation by removing special formatting.
   * For example, a user mention would be encoded as "<@U123456|username>" in the input text, and corresponding output
   * would read "@username". See: <https://api.slack.com/docs/formatting>
   *
   * @deprecated This class is no longer used for internal operations since 4.5.0. It will be removed in 5.0.0.
   *
   * @param {SlackDataStore} dataStore - an RTM client DataStore instance
   * @param {Robot} robot - a Hubot robot instance
   */
  constructor(dataStore, robot) {
    this.dataStore = dataStore;
    this.robot = robot;
  }

  /**
   * Formats links and ids
   */
  links = text => {
    this.warnForDeprecation();
    const regex = /<([@#!])?([^>|]+)(?:\|([^>]+))?>/g; // opening angle bracket
    // link type
    // link
    // start of |label (optional)
    // label
    // end of label
    // closing angle bracket
    text = text.replace(regex, (m, type, link, label) => {
      const MESSAGE_RESERVED_KEYWORDS = ['channel', 'group', 'everyone', 'here'];

      switch (type) {
        case '@':
          if (label) {
            return `@${label}`;
          }
          const user = this.dataStore.getUserById(link);
          if (user) {
            return `@${user.name}`;
          }
          break;
        case '#':
          if (label) {
            return `\#${label}`;
          }
          const channel = this.dataStore.getChannelById(link);
          if (channel) {
            return `\#${channel.name}`;
          }
          break;
        case '!':
          if (MESSAGE_RESERVED_KEYWORDS.indexOf(link) >= 0) {
            return `@${link}`;
          } else if (label) {
            return label;
          }
          return m;
        default:
          link = link.replace(/^mailto:/, '');
          if (label && -1 === link.indexOf(label)) {
            return `${label} (${link})`;
          } else {
            return link;
          }
      }
    });
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    return text.replace(/&amp;/g, '&');
  }

  /**
   * Flattens message text and attachments into a multi-line string
   */
  flatten = message => {
    this.warnForDeprecation();
    const text = [];
    if (message.text) {
      // basic text messages
      text.push(message.text);
    }
    const attachments = message.attachments || [];
    // append all attachments
    attachments.forEach(attachment => {
      text.push(attachment.fallback);
    })
    // flatten array
    return text.join('\n');
  }

  /**
   * Formats an incoming Slack message
   */
  incoming = message => {
    this.warnForDeprecation();
    return this.links(this.flatten(message));
  }

  /**
   * Logs the deprecation warning
   */
  warnForDeprecation() {
    if (this.robot) {
      return this.robot.logger.warning("SlackFormatter is deprecated and will be removed in the next major version of " +
        "hubot-slack. This class was tightly coupled to the now-deprecated dataStore. Formatting functionality has " +
        "been moved to the SlackTextMessage class. If that class does not suit your needs, please file an issue " +
        "<https://github.com/slackapi/hubot-slack/issues>");
    }
  }

};

module.exports = SlackFormatter;
