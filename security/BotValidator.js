// security/BotValidator.js

import {
  normalizePermissions,
  validateRequestedPermissions,
} from './PermissionManager';

import {
  validateURL,
  canUseBotURL,
} from './URLValidator';

/**
 * BotValidator
 *
 * Client-side security and validation layer for Nax bots.
 *
 * IMPORTANT:
 * This validator improves client-side safety and UX.
 * Firebase Security Rules / backend validation must still enforce
 * the real security boundaries.
 */

/* -------------------------------------------------------------------------- */
/* Limits                                                                     */
/* -------------------------------------------------------------------------- */

export const BOT_LIMITS = {
  name: {
    min: 1,
    max: 80,
  },

  username: {
    min: 3,
    max: 32,
  },

  description: {
    min: 0,
    max: 1000,
  },

  welcomeMessage: {
    min: 0,
    max: 2000,
  },

  commands: {
    max: 100,
  },

  commandName: {
    min: 1,
    max: 32,
  },

  commandDescription: {
    min: 0,
    max: 200,
  },

  buttons: {
    max: 100,
  },

  buttonLabel: {
    min: 1,
    max: 50,
  },

  buttonURL: {
    max: 2048,
  },

  permissions: {
    max: 30,
  },

  tags: {
    max: 20,
  },

  tag: {
    min: 1,
    max: 30,
  },
};

/* -------------------------------------------------------------------------- */
/* Supported types                                                            */
/* -------------------------------------------------------------------------- */

export const BOT_BUTTON_TYPES = {
  TEXT: 'text',
  URL: 'url',
  COMMAND: 'command',
};

export const BOT_RESPONSE_TYPES = {
  TEXT: 'text',
  BUTTONS: 'buttons',
  LINK: 'link',
};

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                            */
/* -------------------------------------------------------------------------- */

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toSafeString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function uniqueStrings(values = []) {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = String(value).toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function createResult(valid, errors = [], warnings = []) {
  return {
    valid,
    errors,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Username                                                                   */
/* -------------------------------------------------------------------------- */

export function normalizeBotUsername(username = '') {
  return toSafeString(username)
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\s+/g, '');
}

export function isValidBotUsername(username = '') {
  const normalized = normalizeBotUsername(username);

  if (
    normalized.length < BOT_LIMITS.username.min ||
    normalized.length > BOT_LIMITS.username.max
  ) {
    return false;
  }

  return /^[a-z0-9_]+$/.test(normalized);
}

export function validateBotUsername(username = '') {
  const normalized = normalizeBotUsername(username);
  const errors = [];

  if (!normalized) {
    errors.push('Bot username is required.');
    return createResult(false, errors);
  }

  if (normalized.length < BOT_LIMITS.username.min) {
    errors.push(
      `Bot username must be at least ${BOT_LIMITS.username.min} characters.`
    );
  }

  if (normalized.length > BOT_LIMITS.username.max) {
    errors.push(
      `Bot username must not exceed ${BOT_LIMITS.username.max} characters.`
    );
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    errors.push(
      'Bot username can contain only lowercase letters, numbers, and underscores.'
    );
  }

  return createResult(errors.length === 0, errors);
}

/* -------------------------------------------------------------------------- */
/* Command                                                                    */
/* -------------------------------------------------------------------------- */

export function normalizeCommandName(name = '') {
  return toSafeString(name)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\s+/g, '_')
    .slice(0, BOT_LIMITS.commandName.max);
}

export function normalizeBotCommand(command = {}) {
  if (!isObject(command)) {
    return {
      name: '',
      description: '',
      response: '',
      responseType: BOT_RESPONSE_TYPES.TEXT,
      buttons: [],
    };
  }

  return {
    ...command,
    name: normalizeCommandName(command.name),
    description: toSafeString(command.description)
      .trim()
      .slice(0, BOT_LIMITS.commandDescription.max),

    response: toSafeString(command.response)
      .trim()
      .slice(0, 5000),

    responseType:
      Object.values(BOT_RESPONSE_TYPES).includes(command.responseType)
        ? command.responseType
        : BOT_RESPONSE_TYPES.TEXT,

    buttons: Array.isArray(command.buttons)
      ? command.buttons.slice(0, BOT_LIMITS.buttons.max)
      : [],
  };
}

export function validateBotCommand(command = {}) {
  const normalized = normalizeBotCommand(command);
  const errors = [];
  const warnings = [];

  if (!normalized.name) {
    errors.push('Command name is required.');
  } else {
    if (normalized.name.length < BOT_LIMITS.commandName.min) {
      errors.push('Command name cannot be empty.');
    }

    if (normalized.name.length > BOT_LIMITS.commandName.max) {
      errors.push(
        `Command name must not exceed ${BOT_LIMITS.commandName.max} characters.`
      );
    }

    if (!/^[a-z0-9_]+$/.test(normalized.name)) {
      errors.push(
        'Command name can contain only lowercase letters, numbers, and underscores.'
      );
    }
  }

  if (
    normalized.description.length >
    BOT_LIMITS.commandDescription.max
  ) {
    errors.push(
      `Command description must not exceed ${BOT_LIMITS.commandDescription.max} characters.`
    );
  }

  if (!normalized.response) {
    warnings.push(
      `Command "/${normalized.name || 'command'}" has no response.`
    );
  }

  if (
    normalized.responseType === BOT_RESPONSE_TYPES.BUTTONS &&
    normalized.buttons.length === 0
  ) {
    warnings.push(
      `Command "/${normalized.name || 'command'}" uses buttons response type but has no buttons.`
    );
  }

  return createResult(errors.length === 0, errors, warnings);
}

export function validateBotCommands(commands = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(commands)) {
    return createResult(false, ['Commands must be an array.']);
  }

  if (commands.length > BOT_LIMITS.commands.max) {
    errors.push(
      `A bot cannot contain more than ${BOT_LIMITS.commands.max} commands.`
    );
  }

  const normalizedNames = new Set();

  commands.forEach((command, index) => {
    const result = validateBotCommand(command);

    result.errors.forEach((error) => {
      errors.push(`Command ${index + 1}: ${error}`);
    });

    result.warnings.forEach((warning) => {
      warnings.push(warning);
    });

    const normalized = normalizeCommandName(command?.name);

    if (normalized) {
      if (normalizedNames.has(normalized)) {
        errors.push(`Duplicate command detected: /${normalized}`);
      }

      normalizedNames.add(normalized);
    }
  });

  return createResult(errors.length === 0, errors, warnings);
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export function normalizeBotButton(button = {}) {
  if (!isObject(button)) {
    return {
      type: BOT_BUTTON_TYPES.TEXT,
      label: '',
      text: '',
      url: '',
      command: '',
    };
  }

  return {
    ...button,

    type: Object.values(BOT_BUTTON_TYPES).includes(button.type)
      ? button.type
      : BOT_BUTTON_TYPES.TEXT,

    label: toSafeString(button.label)
      .trim()
      .slice(0, BOT_LIMITS.buttonLabel.max),

    text: toSafeString(button.text)
      .trim()
      .slice(0, 1000),

    url: toSafeString(button.url)
      .trim()
      .slice(0, BOT_LIMITS.buttonURL.max),

    command: normalizeCommandName(button.command),
  };
}

export function validateBotButton(button = {}) {
  const normalized = normalizeBotButton(button);
  const errors = [];
  const warnings = [];

  if (!normalized.label) {
    errors.push('Button label is required.');
  }

  if (
    normalized.label.length > BOT_LIMITS.buttonLabel.max
  ) {
    errors.push(
      `Button label must not exceed ${BOT_LIMITS.buttonLabel.max} characters.`
    );
  }

  if (!Object.values(BOT_BUTTON_TYPES).includes(normalized.type)) {
    errors.push('Invalid button type.');
  }

  if (normalized.type === BOT_BUTTON_TYPES.TEXT) {
    if (!normalized.text) {
      errors.push('Text button requires button text.');
    }
  }

  if (normalized.type === BOT_BUTTON_TYPES.URL) {
    if (!normalized.url) {
      errors.push('URL button requires a URL.');
    } else {
      const urlResult = validateURL(normalized.url);

      if (!urlResult.valid) {
        errors.push(
          urlResult.error || 'Button URL is not allowed.'
        );
      } else if (!canUseBotURL(normalized.url)) {
        errors.push('This URL cannot be used by a bot button.');
      }
    }
  }

  if (normalized.type === BOT_BUTTON_TYPES.COMMAND) {
    if (!normalized.command) {
      errors.push('Command button requires a command.');
    }
  }

  return createResult(errors.length === 0, errors, warnings);
}

export function validateBotButtons(buttons = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(buttons)) {
    return createResult(false, ['Buttons must be an array.']);
  }

  if (buttons.length > BOT_LIMITS.buttons.max) {
    errors.push(
      `A bot cannot contain more than ${BOT_LIMITS.buttons.max} buttons.`
    );
  }

  buttons.forEach((button, index) => {
    const result = validateBotButton(button);

    result.errors.forEach((error) => {
      errors.push(`Button ${index + 1}: ${error}`);
    });

    result.warnings.forEach((warning) => {
      warnings.push(warning);
    });
  });

  return createResult(errors.length === 0, errors, warnings);
}

/* -------------------------------------------------------------------------- */
/* Description / welcome message                                              */
/* -------------------------------------------------------------------------- */

export function validateBotDescription(description = '') {
  const value = toSafeString(description).trim();
  const errors = [];

  if (value.length > BOT_LIMITS.description.max) {
    errors.push(
      `Bot description must not exceed ${BOT_LIMITS.description.max} characters.`
    );
  }

  return createResult(errors.length === 0, errors);
}

export function validateWelcomeMessage(message = '') {
  const value = toSafeString(message).trim();
  const errors = [];

  if (value.length > BOT_LIMITS.welcomeMessage.max) {
    errors.push(
      `Welcome message must not exceed ${BOT_LIMITS.welcomeMessage.max} characters.`
    );
  }

  return createResult(errors.length === 0, errors);
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                       */
/* -------------------------------------------------------------------------- */

export function normalizeBotTags(tags = []) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return uniqueStrings(
    tags
      .map((tag) =>
        toSafeString(tag)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .slice(0, BOT_LIMITS.tag.max)
      )
      .filter(Boolean)
  ).slice(0, BOT_LIMITS.tags.max);
}

export function validateBotTags(tags = []) {
  const errors = [];

  if (!Array.isArray(tags)) {
    return createResult(false, ['Tags must be an array.']);
  }

  if (tags.length > BOT_LIMITS.tags.max) {
    errors.push(
      `A bot cannot have more than ${BOT_LIMITS.tags.max} tags.`
    );
  }

  tags.forEach((tag, index) => {
    const value = toSafeString(tag).trim();

    if (!value) {
      errors.push(`Tag ${index + 1} cannot be empty.`);
      return;
    }

    if (value.length > BOT_LIMITS.tag.max) {
      errors.push(
        `Tag ${index + 1} must not exceed ${BOT_LIMITS.tag.max} characters.`
      );
    }
  });

  return createResult(errors.length === 0, errors);
}

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

export function validateBotPermissions(permissions = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(permissions)) {
    return createResult(false, ['Permissions must be an array.']);
  }

  if (permissions.length > BOT_LIMITS.permissions.max) {
    errors.push(
      `A bot cannot request more than ${BOT_LIMITS.permissions.max} permissions.`
    );
  }

  const normalized = normalizePermissions(permissions);

  const permissionResult =
    validateRequestedPermissions(normalized);

  if (!permissionResult.valid) {
    permissionResult.errors.forEach((error) => {
      errors.push(error);
    });
  }

  if (permissionResult.warnings) {
    permissionResult.warnings.forEach((warning) => {
      warnings.push(warning);
    });
  }

  return createResult(
    errors.length === 0,
    errors,
    warnings
  );
}

/* -------------------------------------------------------------------------- */
/* Complete bot validation                                                    */
/* -------------------------------------------------------------------------- */

export function validateBot(bot = {}) {
  const errors = [];
  const warnings = [];

  if (!isObject(bot)) {
    return createResult(false, ['Bot configuration must be an object.']);
  }

  const name = toSafeString(bot.name).trim();

  if (!name) {
    errors.push('Bot name is required.');
  }

  if (name.length > BOT_LIMITS.name.max) {
    errors.push(
      `Bot name must not exceed ${BOT_LIMITS.name.max} characters.`
    );
  }

  const usernameResult = validateBotUsername(bot.username);

  if (!usernameResult.valid) {
    errors.push(...usernameResult.errors);
  }

  const descriptionResult =
    validateBotDescription(bot.description);

  if (!descriptionResult.valid) {
    errors.push(...descriptionResult.errors);
  }

  const welcomeResult =
    validateWelcomeMessage(bot.welcomeMessage);

  if (!welcomeResult.valid) {
    errors.push(...welcomeResult.errors);
  }

  const commandResult =
    validateBotCommands(bot.commands || []);

  if (!commandResult.valid) {
    errors.push(...commandResult.errors);
  }

  warnings.push(...commandResult.warnings);

  const buttonResult =
    validateBotButtons(bot.buttons || []);

  if (!buttonResult.valid) {
    errors.push(...buttonResult.errors);
  }

  warnings.push(...buttonResult.warnings);

  const tagResult =
    validateBotTags(bot.tags || []);

  if (!tagResult.valid) {
    errors.push(...tagResult.errors);
  }

  const permissionResult =
    validateBotPermissions(bot.permissions || []);

  if (!permissionResult.valid) {
    errors.push(...permissionResult.errors);
  }

  warnings.push(...permissionResult.warnings);

  return createResult(
    errors.length === 0,
    errors,
    warnings
  );
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                              */
/* -------------------------------------------------------------------------- */

export function normalizeBotConfig(bot = {}) {
  if (!isObject(bot)) {
    return {};
  }

  const normalized = {
    ...bot,

    name: toSafeString(bot.name)
      .trim()
      .slice(0, BOT_LIMITS.name.max),

    username: normalizeBotUsername(bot.username),

    description: toSafeString(bot.description)
      .trim()
      .slice(0, BOT_LIMITS.description.max),

    welcomeMessage: toSafeString(bot.welcomeMessage)
      .trim()
      .slice(0, BOT_LIMITS.welcomeMessage.max),

    commands: Array.isArray(bot.commands)
      ? bot.commands
          .slice(0, BOT_LIMITS.commands.max)
          .map(normalizeBotCommand)
      : [],

    buttons: Array.isArray(bot.buttons)
      ? bot.buttons
          .slice(0, BOT_LIMITS.buttons.max)
          .map(normalizeBotButton)
      : [],

    tags: normalizeBotTags(bot.tags || []),

    permissions: normalizePermissions(
      Array.isArray(bot.permissions)
        ? bot.permissions.slice(0, BOT_LIMITS.permissions.max)
        : []
    ),
  };

  return normalized;
}

/* -------------------------------------------------------------------------- */
/* Publication checks                                                         */
/* -------------------------------------------------------------------------- */

export function canPublishBot(bot = {}) {
  const result = validateBot(bot);

  if (!result.valid) {
    return {
      allowed: false,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  return {
    allowed: true,
    errors: [],
    warnings: result.warnings,
  };
}

export function canRunBot(bot = {}) {
  if (!isObject(bot)) {
    return {
      allowed: false,
      errors: ['Bot configuration is invalid.'],
    };
  }

  if (bot.status === 'suspended') {
    return {
      allowed: false,
      errors: ['This bot is suspended.'],
    };
  }

  if (bot.status === 'deleted') {
    return {
      allowed: false,
      errors: ['This bot has been deleted.'],
    };
  }

  const result = validateBot(bot);

  return {
    allowed: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Sanitization                                                               */
/* -------------------------------------------------------------------------- */

export function sanitizeBot(bot = {}) {
  const normalized = normalizeBotConfig(bot);

  return {
    ...normalized,

    name: toSafeString(normalized.name)
      .replace(/[<>]/g, '')
      .trim(),

    username: normalizeBotUsername(normalized.username),

    description: toSafeString(normalized.description)
      .replace(/[<>]/g, '')
      .trim(),

    welcomeMessage: toSafeString(normalized.welcomeMessage)
      .replace(/[<>]/g, '')
      .trim(),

    commands: normalized.commands.map((command) => ({
      ...command,
      name: normalizeCommandName(command.name),
      description: toSafeString(command.description)
        .replace(/[<>]/g, '')
        .trim(),
      response: toSafeString(command.response)
        .replace(/[<>]/g, '')
        .trim(),
      buttons: Array.isArray(command.buttons)
        ? command.buttons.map(normalizeBotButton)
        : [],
    })),

    buttons: normalized.buttons.map(normalizeBotButton),

    tags: normalizeBotTags(normalized.tags),

    permissions: normalizePermissions(
      normalized.permissions
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Command / button consistency                                               */
/* -------------------------------------------------------------------------- */

export function validateBotConsistency(bot = {}) {
  const errors = [];
  const warnings = [];

  if (!isObject(bot)) {
    return createResult(
      false,
      ['Bot configuration must be an object.']
    );
  }

  const commandNames = new Set(
    (bot.commands || [])
      .map((command) =>
        normalizeCommandName(command?.name)
      )
      .filter(Boolean)
  );

  const allButtons = [
    ...(Array.isArray(bot.buttons) ? bot.buttons : []),
    ...(Array.isArray(bot.commands)
      ? bot.commands.flatMap((command) =>
          Array.isArray(command?.buttons)
            ? command.buttons
            : []
        )
      : []),
  ];

  allButtons.forEach((button, index) => {
    const normalized = normalizeBotButton(button);

    if (
      normalized.type === BOT_BUTTON_TYPES.COMMAND &&
      normalized.command &&
      !commandNames.has(normalized.command)
    ) {
      errors.push(
        `Button ${index + 1} references unknown command "/${normalized.command}".`
      );
    }
  });

  const commandSet = new Set();

  (bot.commands || []).forEach((command) => {
    const name = normalizeCommandName(command?.name);

    if (!name) {
      return;
    }

    if (commandSet.has(name)) {
      errors.push(`Duplicate command: /${name}`);
    }

    commandSet.add(name);
  });

  if (
    bot.responseType &&
    !Object.values(BOT_RESPONSE_TYPES).includes(
      bot.responseType
    )
  ) {
    warnings.push(
      'Bot has an unsupported response type.'
    );
  }

  return createResult(
    errors.length === 0,
    errors,
    warnings
  );
}

/* -------------------------------------------------------------------------- */
/* Publication validation                                                    */
/* -------------------------------------------------------------------------- */

export function validateBotForPublication(bot = {}) {
  const errors = [];
  const warnings = [];

  const baseResult = validateBot(bot);

  errors.push(...baseResult.errors);
  warnings.push(...baseResult.warnings);

  const consistencyResult =
    validateBotConsistency(bot);

  errors.push(...consistencyResult.errors);
  warnings.push(...consistencyResult.warnings);

  if (!bot.visibility) {
    warnings.push(
      'Bot visibility is not specified.'
    );
  }

  if (
    bot.status &&
    !['draft', 'published', 'suspended'].includes(
      bot.status
    )
  ) {
    errors.push(
      `Unsupported bot status: ${bot.status}`
    );
  }

  return createResult(
    errors.length === 0,
    uniqueStrings(errors),
    uniqueStrings(warnings)
  );
}

/* -------------------------------------------------------------------------- */
/* Security summary                                                           */
/* -------------------------------------------------------------------------- */

export function getBotSecuritySummary(bot = {}) {
  const validation = validateBotForPublication(bot);

  const permissions = normalizePermissions(
    Array.isArray(bot.permissions)
      ? bot.permissions
      : []
  );

  const permissionValidation =
    validateBotPermissions(permissions);

  const urlButtons = [];

  const collectButtons = (buttons = []) => {
    if (!Array.isArray(buttons)) {
      return;
    }

    buttons.forEach((button) => {
      const normalized = normalizeBotButton(button);

      if (
        normalized.type === BOT_BUTTON_TYPES.URL &&
        normalized.url
      ) {
        urlButtons.push(normalized.url);
      }
    });
  };

  collectButtons(bot.buttons);

  if (Array.isArray(bot.commands)) {
    bot.commands.forEach((command) => {
      collectButtons(command?.buttons);
    });
  }

  const urlResults = urlButtons.map((url) => ({
    url,
    result: validateURL(url),
  }));

  return {
    valid: validation.valid,
    publishable: validation.valid,

    errors: validation.errors,
    warnings: validation.warnings,

    permissions: {
      requested: permissions,
      valid: permissionValidation.valid,
      errors: permissionValidation.errors,
      warnings: permissionValidation.warnings,
    },

    urls: {
      count: urlButtons.length,
      valid: urlResults.every(
        (item) => item.result.valid
      ),
      results: urlResults,
    },

    limits: BOT_LIMITS,
  };
}

/* -------------------------------------------------------------------------- */
/* Convenience API                                                            */
/* -------------------------------------------------------------------------- */

export const BotValidator = {
  limits: BOT_LIMITS,

  buttonTypes: BOT_BUTTON_TYPES,

  responseTypes: BOT_RESPONSE_TYPES,

  normalizeUsername: normalizeBotUsername,
  isValidUsername: isValidBotUsername,
  validateUsername: validateBotUsername,

  normalizeCommandName,
  normalizeCommand: normalizeBotCommand,
  validateCommand: validateBotCommand,
  validateCommands: validateBotCommands,

  normalizeButton: normalizeBotButton,
  validateButton: validateBotButton,
  validateButtons: validateBotButtons,

  validateDescription: validateBotDescription,
  validateWelcomeMessage,

  normalizeTags: normalizeBotTags,
  validateTags: validateBotTags,

  validatePermissions: validateBotPermissions,

  validate: validateBot,
  normalize: normalizeBotConfig,
  sanitize: sanitizeBot,

  canPublish: canPublishBot,
  canRun: canRunBot,

  validateConsistency: validateBotConsistency,
  validateForPublication: validateBotForPublication,

  getSecuritySummary: getBotSecuritySummary,
};

export default BotValidator;
