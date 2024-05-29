'use strict';

import SlackClient from "./client.mjs";
import { SlackTextMessage, MeMessage, ReactionMessage, PresenceMessage, FileSharedMessage} from './message.mjs';
import { Adapter, TopicMessage, LeaveMessage, EnterMessage } from 'hubot';

/**
 * Slackbot is an adapter for connecting Hubot to Slack
 * @constructor
 * @param {Robot} robot - the Hubot robot
 * @param {Object} options - configuration options for the adapter
 * @param {string} options.token - authentication token for Slack APIs
 * @param {Boolean} options.disableUserSync - disables syncing all user data on start
 * @param {string} options.apiPageSize - sets Slack API page size
 * @param {Boolean} options.installedTeamOnly - reacts to only messages by insalled workspace users in a shared channel
 * @param {Object} options.rtm - RTM configuration options for SlackClient
 * @param {Object} options.rtmStart - options for `rtm.start` Web API method
 */
class SlackBot extends Adapter {
  constructor(robot, options) {
    super(robot);
    this.robot = robot;
    this.options = options;
    this.robot.logger.info("hubot-slack adapter v" + process.env.npm_package_version);
    this.client = new SlackClient(this.options, this.robot);
  }

  /**
   * Slackbot initialization
   * @public
   */
  run = () => {
    if (!this.options.token) {
      // Token validation
      return this.robot.logger.error("No token provided to Hubot");
    }
    const ref = this.options.token.substring(0, 5);
    if (!(ref === "xoxb-" || ref === "xoxp-")) {
      return this.robot.logger.error("Invalid token provided, please follow the upgrade instructions");
    }
    // SlackClient event handlers
    this.client.rtm.on("connected", this.open);
    this.client.rtm.on("close", this.close);
    this.client.rtm.on("disconnecting", this.disconnect);
    this.client.rtm.on("error", this.error);
    this.client.rtm.on("authenticated", this.authenticated);
    this.client.onEvent(this.eventHandler);
    // TODO: set this to false as soon as RTM connection closes (even if reconnect will happen later)
    // TODO: check this value when connection finishes (even if its a reconnection)
    // TODO: build a map of enterprise users and local users
    this.needsUserListSync = true;
    if (!this.options.disableUserSync) {
      // Synchronize workspace users to brain
      this.client.loadUsers(this.usersLoaded);
    } else {
      this.brainIsLoaded = true;
    }
    // Brain will emit 'loaded' the first time it connects to its storage and then again each time a key is set
    this.robot.brain.on("loaded", () => {
      if (!this.brainIsLoaded) {
        this.brainIsLoaded = true;
        // The following code should only run after the first time the brain connects to its storage

        // There's a race condition where the connection can happen after the above `@client.loadUsers` call finishes,
        // in which case the calls to save users in `@usersLoaded` would not persist. It is still necessary to call the
        // method there in the case Hubot is running without brain storage.
        // NOTE: is this actually true? won't the brain have the users in memory and persist to storage as soon as the
        // connection is complete?
        // NOTE: this seems wasteful. when there is brain storage, it will end up loading all the users twice.
        this.client.loadUsers(this.usersLoaded);
        this.isLoaded = true;
        // NOTE: will this only subscribe a partial user list because loadUsers has not yet completed? it will at least
        // subscribe to the users that were stored in the brain from the last run.
        return this.presenceSub();
      }
    });
    // Start logging in
    return this.client.connect();
  };

  /**
   * Hubot is sending a message to Slack
   *
   * @public
   * @param {Object} envelope - fully documented in SlackClient
   * @param {...(string|Object)} messages - fully documented in SlackClient
   */
  send = (envelope, ...messages) => {
    let callback = () => {};
    if (typeof messages[messages.length - 1] === "function") {
      callback = messages.pop();
    }
    const messagePromises = messages.map((message) => {
      if (typeof message === "function") {
        return Promise.resolve();
      }
      if (message !== "") {
        // NOTE: perhaps do envelope manipulation here instead of in the client (separation of concerns)
        return this.client.send(envelope, message);
      }
    });
    return Promise.all(messagePromises).then(callback.bind(null, null), callback);
  }

  /**
   * Hubot is replying to a Slack message
   * @public
   * @param {Object} envelope - fully documented in SlackClient
   * @param {...(string|Object)} messages - fully documented in SlackClient
   */

  reply = (envelope, ...messages) => {
    let callback = function () {
    };
    if (typeof messages[messages.length - 1] === "function") {
      callback = messages.pop();
    }
    const messagePromises = messages.map((message) => {
      if (typeof message === "function") {
        return Promise.resolve();
      }
      if (message !== "") {
        if (envelope.room[0] !== "D") {
          // TODO: channel prefix matching should be removed
          message = `<@${envelope.user.id}>: ${message}`;
        }
        return this.client.send(envelope, message);
      }
    });
    return Promise.all(messagePromises).then(callback.bind(null, null), callback);
  }

  /**
   * Hubot is setting the Slack conversation topic
   * @public
   * @param {Object} envelope - fully documented in SlackClient
   * @param {...string} strings - strings that will be newline separated and set to the conversation topic
   */
  setTopic = (envelope, ...strings) => {
    // TODO: if the sender is interested in the completion, the last item in `messages` will be a function
    // TODO: this will fail if sending an object as a value in strings
    return this.client.setTopic(envelope.room, strings.join("\n"));
  }

  /**
   * Hubot is sending a reaction
   * NOTE: the super class implementation is just an alias for send, but potentially, we can detect
   * if the envelope has a specific message and send a reactji. the fallback would be to just send the
   * emoji as a message in the channel
   */
  // emote: (envelope, strings)

  /*
   * SlackClient event handlers
   */

  /**
   * Slack client has opened the connection
   * @private
   */
  open = () => {
    this.robot.logger.info("Connected to Slack RTM");
    // Tell Hubot we're connected so it can load scripts
    return this.emit("connected");
  }

  /**
   * Slack client has authenticated
   *
   * @private
   * @param {SlackRtmStart|SlackRtmConnect} identity - the response from calling the Slack Web API method `rtm.start` or
   * `rtm.connect`
   */
  authenticated = identity => {
    this.self = identity.self;
    const team = identity.team;
    let i, len, user;
    this.self.installed_team_id = team.id;
    // Find out bot_id
    // NOTE: this information can be fetched by using `bots.info` combined with `users.info`. This presents an
    // alternative that decouples Hubot from `rtm.start` and would make it compatible with `rtm.connect`.
    if (identity.users) {
      const user = identity.users.find(user => user.id === this.self.id);
      if (user) {
        this.robot.logger.debug("SlackBot#authenticated() Found self in RTM start data");
        this.self.bot_id = user.profile.bot_id;
      }
    }
    // Provide name to Hubot so it can be used for matching in `robot.respond()`. This must be a username, despite the
    // deprecation, because the SlackTextMessage#buildText() will format mentions into `@username`, and that is what
    // Hubot will be comparing to the message text.
    this.robot.name = this.self.name;
    return this.robot.logger.info(`Logged in as @${this.robot.name} in workspace ${team.name}`);
  }

  /**
   * Creates a presense subscripton for all users in the brain
   * @private
   */
  presenceSub = () => {
    // Only subscribe to status changes from human users that are not deleted
    const users = this.robot.brain.data.users;
    const results = [];
    for (let id in users) {
      const user = users[id];
      if (!user.is_bot && !user.deleted) {
        results.push(id);
      }
    }
    this.robot.logger.debug(`SlackBot#presenceSub() Subscribing to presence for ${results.length} users`);
    return this.client.rtm.subscribePresence(results);
  }

  /**
   * Slack client has closed the connection
   * @private
   */
  close = () => {
    if (this.options.autoReconnect) {
      this.robot.logger.info("Disconnected from Slack RTM");
      return this.robot.logger.info("Waiting for reconnect...");
    } else {
      return this.disconnect();
    }
  }

  /**
   * Slack client has closed the connection and will not reconnect
   * @private
   */
  disconnect = () => {
    this.robot.logger.info("Disconnected from Slack RTM");
    this.robot.logger.info("Exiting...");
    this.client.disconnect();
    // NOTE: Node recommends not to call process.exit() but Hubot itself uses this mechanism for shutting down
    // Can we make sure the brain is flushed to persistence? Do we need to cleanup any state (or timestamp anything)?
    return process.exit(1);
  }

  /**
   * Slack client received an error
   *
   * @private
   * @param {SlackRtmError} error - An error emitted from the [Slack RTM API](https://api.slack.com/rtm)
   */
  error = error => {
    this.robot.logger.error(`Slack RTM error: ${JSON.stringify(error)}`);
    // Assume that scripts can handle slowing themselves down, all other errors are bubbled up through Hubot
    // NOTE: should rate limit errors also bubble up?
    if (error.code !== -1) {
      return this.robot.emit("error", error);
    }
  }

  /**
   * Incoming Slack event handler
   *
   * This method is used to ingest Slack RTM events and prepare them as Hubot Message objects. The messages are passed
   * to the Robot#receive() method, which allows executes receive middleware and eventually triggers the various
   * listeners that are created by scripts.
   *
   * Depending on the exact type of event, additional properties may be present. The following describes the "special"
   * ones that have meaningful handling across all types.
   *
   * @private
   * @param {Object} event
   * @param {string} event.type - this specifies the event type
   * @param {SlackUserInfo} [event.user] - the description of the user creating this event as returned by `users.info`
   * @param {string} [event.channel] - the conversation ID for where this event took place
   * @param {SlackBotInfo} [event.bot] - the description of the bot creating this event as returned by `bots.info`
   */
  eventHandler = event => {
    const user= event.user;
    const channel= event.channel;
    const event_team_id = event.team;
    // Ignore anything we sent
    if ((user != null ? user.id : void 0) === this.self.id) {
      return;
    }
    if (this.options.installedTeamOnly) {
      // Skip events generated by other workspace users in a shared channel
      if ((event_team_id != null) && event_team_id !== this.self.installed_team_id) {
        this.robot.logger.debug(`Skipped an event generated by an other workspace user (team: ${event_team_id}) in shared channel (channel: ${channel})`);
        return;
      }
    }
    // Send to Hubot based on message type
    if (event.type === "message") {
      // Hubot expects all user objects to have a room property that is used in the envelope for the message after it
      // is received
      user.room = channel != null ? channel : "";
      switch (event.subtype) {
        case "bot_message":
          this.robot.logger.debug(`Received text message in channel: ${channel}, from: ${user.id} (bot)`);
          return SlackTextMessage.makeSlackTextMessage(user, void 0, void 0, event, channel, this.robot.name, this.robot.alias, this.client, (error, message) => {
            if (error) {
              return this.robot.logger.error(`Dropping message due to error ${error.message}`);
            }
            return this.receive(message);
          });
        case "channel_topic":
        case "group_topic":
          this.robot.logger.debug(`Received topic change message in conversation: ${channel}, new topic: ${event.topic}, set by: ${user.id}`);
          return this.receive(new TopicMessage(user, event.topic, event.ts));
        case "me_message":
          this.robot.logger.debug(`Received /me message in channel: ${channel}, from: ${user.id}`);
          return this.receive(new MeMessage(user, event.text, event.ts));
        case "thread_broadcast":
        case void 0:
          this.robot.logger.debug(`Received text message in channel: ${channel}, from: ${user.id} (human)`);
          return SlackTextMessage.makeSlackTextMessage(user, void 0, void 0, event, channel, this.robot.name, this.robot.alias, this.client, (error, message) => {
            if (error) {
              return this.robot.logger.error(`Dropping message due to error ${error.message}`);
            }
            return this.receive(message);
          });
      }
    } else if (event.type === "member_joined_channel") {
      // this event type always has a channel
      user.room = channel;
      this.robot.logger.debug(`Received enter message for user: ${user.id}, joining: ${channel}`);
      const msg = new EnterMessage(user);
      msg.ts = event.ts;
      return this.receive(msg);
    } else if (event.type === "member_left_channel") {
      // this event type always has a channel
      user.room = channel;
      this.robot.logger.debug(`Received leave message for user: ${user.id}, joining: ${channel}`);
      const msg = new LeaveMessage(user);
      msg.ts = event.ts;
      return this.receive(msg);
    } else if (event.type === "reaction_added" || event.type === "reaction_removed") {
      // Once again Hubot expects all user objects to have a room property that is used in the envelope for the message
      // after it is received. If the reaction is to a message, then the `event.item.channel` contain a conversation ID.
      // Otherwise reactions can be on files and file comments, which are "global" and aren't contained in a
      // conversation. In that situation we fallback to an empty string.
      user.room = event.item.type === "message" ? event.item.channel : "";
      // Reaction messages may contain an `event.item_user` property containing a fetched SlackUserInfo object. Before
      // the message is received by Hubot, turn that data into a Hubot User object.
      const item_user = event.item_user != null ? this.robot.brain.userForId(event.item_user.id, event.item_user) : {};
      this.robot.logger.debug(`Received reaction message from: ${user.id}, reaction: ${event.reaction}, item type: ${event.item.type}`);
      return this.receive(new ReactionMessage(event.type, user, event.reaction, item_user, event.item, event.event_ts));
    } else if (event.type === "presence_change") {
      // Collect all Hubot User objects referenced in this presence change event
      // NOTE: this does not create new Hubot User objects for any users that are not already in the brain. It should
      // not be possible for this to happen since Slack will only send events for users where an explicit subscription
      // was made. In the `presenceSub()` method, subscriptions are only made for users in the brain.
      const userIds = event.users || [event.user.id];
      const users = [];
      userIds.forEach(userId => {
        const userInBrain = this.robot.brain.data.users[userId];
        if (userInBrain != null) {
          users.push(userInBrain);
        }
      });
      this.robot.logger.debug(`Received presence update message for users: ${users} with status: ${event.presence}`);
      return this.receive(new PresenceMessage(users, event.presence));
    } else if (event.type === "file_shared") {

      // Once again Hubot expects all user objects to have a room property that is used in the envelope for the message
      // after it is received. If the reaction is to a message, then the `event.item.channel` contain a conversation ID.
      // Otherwise reactions can be on files and file comments, which are "global" and aren't contained in a
      // conversation. In that situation we fallback to an empty string.
      user.room = event.channel_id;
      this.robot.logger.debug(`Received file_shared message from: ${event.user_id}, file_id: ${event.file_id}`);
      return this.receive(new FileSharedMessage(user, event.file_id, event.event_ts));
    }
  }

  /**
   * Callback for fetching all users in workspace. Delegates to `updateUserInBrain()` to write all users to Hubot brain
   *
   * @private
   * @param {Error} [error] - describes an error that occurred while fetching users
   * @param {SlackUsersList} [res] - the response from the Slack Web API method `users.list`
   */
  usersLoaded = (err, res) => {
    if (err || !res.members || !res.members.length) {
      this.robot.logger.error("Can't fetch users");
      return;
    }
    const results = [];
    res.members.forEach(member => {
      results.push(this.client.updateUserInBrain(member));
    });
    return results;
  }
}

export default SlackBot
