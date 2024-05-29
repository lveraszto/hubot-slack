'use strict';

import dotenv from 'dotenv';
import SlackBot from './src/bot.mjs';

dotenv.config();

const use = robot => {
  const options = {
    token: process.env.HUBOT_SLACK_TOKEN,
    disableUserSync: process.env.DISABLE_USER_SYNC != null,
    apiPageSize: process.env.API_PAGE_SIZE,
    // reacts to only messages by insalled workspace users in a shared channel
    installedTeamOnly: process.env.INSTALLED_TEAM_ONLY != null
  };
  try {
    options.rtm = JSON.parse(process.env.HUBOT_SLACK_RTM_CLIENT_OPTS || '{}');
    if (options.rtm.useRtmConnect == null) {
      // The original way to connect to one of our oldest APIs is finally retiring.
      // For existing apps, rtm.start will start behaving exactly like rtm.connect
      // on September 20, 2022. Beginning November 30, 2021, newly created apps and integrations
      // will only be able to use rtm.connect.
      // https://api.slack.com/changelog/2021-10-rtm-start-to-stop
      options.rtm.useRtmConnect = true;
    }
  } catch (e) {
    console.error(e);
  }
  try {
    options.rtmStart = JSON.parse(process.env.HUBOT_SLACK_RTM_START_OPTS || '{}');
  } catch (e) {
    console.error(e);
  }
  return new SlackBot(robot, options);
};

export default { use };
