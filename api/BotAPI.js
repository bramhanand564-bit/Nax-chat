 // api/BotAPI.js

import {
  BotFirebase,
} from '../firebase/bots';

/**
 * Nax Bot API
 *
 * This file is the frontend-facing bridge for the
 * bot ecosystem.
 *
 * UI/screens should eventually use this API instead
 * of talking directly to Firestore.
 */

/**
 * Get bot by ID.
 */
export async function getBot(botId) {
  if (!botId) {
    throw new Error('Bot ID is required.');
  }

  return BotFirebase.getBotById(botId);
}

/**
 * Get bot by username.
 */
export async function getBotByUsername(
  username
) {
  if (!username) {
    throw new Error(
      'Bot username is required.'
    );
  }

  return BotFirebase.getBotByUsername(
    username
  );
}

/**
 * Get bots created by a user.
 */
export async function getMyBots(userId) {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  return BotFirebase.getUserBots(userId);
}

/**
 * Get public bots for Portal.
 */
export async function getPublicBots(
  limitCount = 50
) {
  return BotFirebase.getPublicBots(
    limitCount
  );
}

/**
 * Get bots by category.
 */
export async function getBotsByCategory(
  category,
  limitCount = 50
) {
  return BotFirebase.getBotsByCategory(
    category,
    limitCount
  );
}

/**
 * Search bots.
 */
export async function searchBots(
  searchText = '',
  limitCount = 100
) {
  const bots =
    await BotFirebase.getPublicBots(
      limitCount
    );

  return BotFirebase.filterBotsLocally(
    bots,
    {
      search: searchText,
    }
  );
}

/**
 * Check bot username availability.
 */
export async function isBotUsernameAvailable(
  username
) {
  if (!username) {
    return false;
  }

  return BotFirebase.isBotUsernameAvailable(
    username
  );
}

/**
 * Create a bot.
 */
export async function createBot(botData) {
  if (!botData) {
    throw new Error(
      'Bot data is required.'
    );
  }

  return BotFirebase.createBot(
    botData
  );
}

/**
 * Update a bot.
 */
export async function updateBot(
  botId,
  updates
) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return BotFirebase.updateBot(
    botId,
    updates
  );
}

/**
 * Delete a bot.
 */
export async function deleteBot(botId) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return BotFirebase.deleteBot(
    botId
  );
}

/**
 * Increment bot views.
 */
export async function trackBotView(
  botId
) {
  if (!botId) {
    return false;
  }

  return BotFirebase.incrementBotViews(
    botId
  );
}

/**
 * Increment bot usage.
 */
export async function trackBotUsage(
  botId
) {
  if (!botId) {
    return false;
  }

  return BotFirebase.incrementBotUsage(
    botId
  );
}

/**
 * Increment bot installs.
 */
export async function trackBotInstall(
  botId
) {
  if (!botId) {
    return false;
  }

  return BotFirebase.incrementBotInstalls(
    botId
  );
}

/**
 * Prepare a bot for Portal display.
 *
 * This prevents UI components from depending
 * on the entire Firestore document.
 */
export function toPortalBot(bot) {
  if (!bot) {
    return null;
  }

  return {
    id: bot.id,

    name: bot.name || 'Unnamed Bot',

    username: bot.username
      ? `@${String(
          bot.username
        ).replace(/^@/, '')}`
      : '',

    description:
      bot.description || '',

    icon: bot.icon || '',

    category:
      bot.category || 'Other',

    verified:
      Boolean(bot.verified),

    installs:
      Number(bot.installs || 0),

    views:
      Number(bot.views || 0),

    usageCount:
      Number(bot.usageCount || 0),
  };
}

/**
 * Prepare a bot for chat/runtime.
 *
 * Runtime should still validate permissions and
 * commands before executing anything.
 */
export function toRuntimeBot(bot) {
  if (!bot) {
    return null;
  }

  return {
    id: bot.id,

    name: bot.name || '',

    username:
      bot.username || '',

    description:
      bot.description || '',

    welcomeMessage:
      bot.welcomeMessage || '',

    commands:
      Array.isArray(bot.commands)
        ? bot.commands
        : [],

    buttons:
      Array.isArray(bot.buttons)
        ? bot.buttons
        : [],

    permissions:
      Array.isArray(bot.permissions)
        ? bot.permissions
        : [],

    settings:
      bot.settings &&
      typeof bot.settings === 'object'
        ? bot.settings
        : {},
  };
}

/**
 * Validate basic bot data before API call.
 *
 * This is only frontend validation.
 * Real authorization/security must be enforced
 * by Firestore Rules/backend.
 */
export function validateBotInput(
  botData = {}
) {
  const errors = [];

  if (
    !botData.name ||
    !String(botData.name).trim()
  ) {
    errors.push(
      'Bot name is required.'
    );
  }

  if (
    !botData.username ||
    !String(botData.username).trim()
  ) {
    errors.push(
      'Bot username is required.'
    );
  }

  const username =
    String(
      botData.username || ''
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, '');

  if (
    username &&
    !/^[a-z0-9_]{3,32}$/.test(
      username
    )
  ) {
    errors.push(
      'Bot username must be 3-32 characters and use only letters, numbers, or _.'
    );
  }

  if (
    botData.description &&
    String(botData.description)
      .length > 1000
  ) {
    errors.push(
      'Bot description is too long.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize bot creation data.
 */
export function normalizeBotInput(
  botData = {}
) {
  return {
    ...botData,

    name: String(
      botData.name || ''
    ).trim(),

    username: String(
      botData.username || ''
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, ''),

    description: String(
      botData.description || ''
    ).trim(),

    welcomeMessage: String(
      botData.welcomeMessage || ''
    ).trim(),

    category:
      botData.category ||
      'Other',

    commands:
      Array.isArray(botData.commands)
        ? botData.commands
        : [],

    buttons:
      Array.isArray(botData.buttons)
        ? botData.buttons
        : [],

    permissions:
      Array.isArray(botData.permissions)
        ? botData.permissions
        : [],
  };
}

/**
 * Create bot with validation.
 */
export async function createValidatedBot(
  botData
) {
  const normalized =
    normalizeBotInput(
      botData
    );

  const validation =
    validateBotInput(
      normalized
    );

  if (!validation.valid) {
    throw new Error(
      validation.errors.join(' ')
    );
  }

  const available =
    await isBotUsernameAvailable(
      normalized.username
    );

  if (!available) {
    throw new Error(
      'This bot username is already in use.'
    );
  }

  return createBot(
    normalized
  );
}

/**
 * Update bot with basic validation.
 */
export async function updateValidatedBot(
  botId,
  updates = {}
) {
  const normalized =
    normalizeBotInput(
      updates
    );

  const validation =
    validateBotInput(
      {
        ...normalized,
        /**
         * Name/username may be omitted for partial
         * updates, so remove those errors below.
         */
      }
    );

  const errors =
    validation.errors.filter(
      (error) =>
        error !==
          'Bot name is required.' &&
        error !==
          'Bot username is required.'
    );

  if (errors.length > 0) {
    throw new Error(
      errors.join(' ')
    );
  }

  return updateBot(
    botId,
    normalized
  );
}

/**
 * Bot API object.
 */
export const BotAPI = {
  getBot,
  getBotByUsername,
  getMyBots,

  getPublicBots,
  getBotsByCategory,
  searchBots,

  isBotUsernameAvailable,

  createBot,
  createValidatedBot,

  updateBot,
  updateValidatedBot,

  deleteBot,

  trackBotView,
  trackBotUsage,
  trackBotInstall,

  toPortalBot,
  toRuntimeBot,

  validateBotInput,
  normalizeBotInput,
};

export default BotAPI;
