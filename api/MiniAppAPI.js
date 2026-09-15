// api/MiniAppAPI.js

import {
  MiniAppFirebase,
} from '../firebase/miniApps';

/**
 * Nax Mini-App API
 *
 * Frontend-facing bridge for the Portal / Mini-App
 * ecosystem.
 *
 * UI components should eventually use this API
 * instead of accessing Firestore directly.
 */

/**
 * Get mini-app by ID.
 */
export async function getMiniApp(appId) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.getMiniAppById(
    appId
  );
}

/**
 * Get mini-app by slug.
 */
export async function getMiniAppBySlug(
  slug
) {
  if (!slug) {
    throw new Error(
      'Mini-app slug is required.'
    );
  }

  return MiniAppFirebase.getMiniAppBySlug(
    slug
  );
}

/**
 * Get current user's mini-apps.
 */
export async function getMyMiniApps(
  userId
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return MiniAppFirebase.getUserMiniApps(
    userId
  );
}

/**
 * Get mini-apps owned by a user.
 */
export async function getOwnedMiniApps(
  userId
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return MiniAppFirebase.getOwnedMiniApps(
    userId
  );
}

/**
 * Get public mini-apps for Portal.
 */
export async function getPublicMiniApps(
  limitCount = 50
) {
  return MiniAppFirebase.getPublicMiniApps(
    limitCount
  );
}

/**
 * Get mini-apps by category.
 */
export async function getMiniAppsByCategory(
  category,
  limitCount = 50
) {
  if (!category) {
    return [];
  }

  return MiniAppFirebase.getMiniAppsByCategory(
    category,
    limitCount
  );
}

/**
 * Get featured mini-apps.
 */
export async function getFeaturedMiniApps(
  limitCount = 20
) {
  return MiniAppFirebase.getFeaturedMiniApps(
    limitCount
  );
}

/**
 * Get trending mini-apps.
 */
export async function getTrendingMiniApps(
  limitCount = 20
) {
  return MiniAppFirebase.getTrendingMiniApps(
    limitCount
  );
}

/**
 * Search Portal mini-apps.
 */
export async function searchMiniApps(
  searchText = '',
  limitCount = 100
) {
  return MiniAppFirebase.searchMiniApps(
    searchText,
    limitCount
  );
}

/**
 * Create a mini-app.
 */
export async function createMiniApp(
  appData
) {
  if (!appData) {
    throw new Error(
      'Mini-app data is required.'
    );
  }

  return MiniAppFirebase.createMiniApp(
    appData
  );
}

/**
 * Update a mini-app.
 */
export async function updateMiniApp(
  appId,
  updates
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.updateMiniApp(
    appId,
    updates
  );
}

/**
 * Delete a mini-app.
 */
export async function deleteMiniApp(
  appId
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.deleteMiniApp(
    appId
  );
}

/**
 * Check slug availability.
 */
export async function isMiniAppSlugAvailable(
  slug
) {
  if (!slug) {
    return false;
  }

  return MiniAppFirebase.isMiniAppSlugAvailable(
    slug
  );
}

/**
 * Publish a mini-app.
 */
export async function publishMiniApp(
  appId
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.publishMiniApp(
    appId
  );
}

/**
 * Unpublish a mini-app.
 */
export async function unpublishMiniApp(
  appId
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.unpublishMiniApp(
    appId
  );
}

/**
 * Suspend a mini-app.
 *
 * Intended for moderation/admin use.
 */
export async function suspendMiniApp(
  appId
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.suspendMiniApp(
    appId
  );
}

/**
 * Track a mini-app view.
 */
export async function trackMiniAppView(
  appId
) {
  if (!appId) {
    return false;
  }

  return MiniAppFirebase.incrementMiniAppViews(
    appId
  );
}

/**
 * Track mini-app usage.
 */
export async function trackMiniAppUsage(
  appId
) {
  if (!appId) {
    return false;
  }

  return MiniAppFirebase.incrementMiniAppUsage(
    appId
  );
}

/**
 * Track installation.
 */
export async function trackMiniAppInstall(
  appId
) {
  if (!appId) {
    return false;
  }

  return MiniAppFirebase.incrementMiniAppInstalls(
    appId
  );
}

/**
 * Track uninstall.
 */
export async function trackMiniAppUninstall(
  appId
) {
  if (!appId) {
    return false;
  }

  return MiniAppFirebase.decrementMiniAppInstalls(
    appId
  );
}

/**
 * Get basic statistics.
 */
export async function getMiniAppStats(
  appId
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return MiniAppFirebase.getMiniAppStats(
    appId
  );
}

/**
 * Prepare a mini-app for Portal cards.
 *
 * Only expose fields the Portal UI needs.
 */
export function toPortalMiniApp(
  miniApp
) {
  if (!miniApp) {
    return null;
  }

  return {
    id: miniApp.id,

    name:
      miniApp.name ||
      'Unnamed Mini-App',

    slug:
      miniApp.slug || '',

    description:
      miniApp.shortDescription ||
      miniApp.description ||
      '',

    icon:
      miniApp.icon || '',

    banner:
      miniApp.banner || '',

    category:
      miniApp.category ||
      'Other',

    version:
      miniApp.version ||
      '1.0.0',

    creatorId:
      miniApp.creatorId ||
      '',

    creatorName:
      miniApp.creatorName ||
      '',

    creatorUsername:
      miniApp.creatorUsername ||
      '',

    entryType:
      miniApp.entryType ||
      'web',

    installs:
      Number(
        miniApp.installs || 0
      ),

    views:
      Number(
        miniApp.views || 0
      ),

    usageCount:
      Number(
        miniApp.usageCount || 0
      ),

    rating:
      Number(
        miniApp.rating || 0
      ),

    ratingCount:
      Number(
        miniApp.ratingCount || 0
      ),

    featured:
      Boolean(
        miniApp.featured
      ),

    trending:
      Boolean(
        miniApp.trending
      ),
  };
}

/**
 * Prepare a mini-app for the viewer.
 *
 * IMPORTANT:
 * URL/entry must still pass security validation
 * before being opened or executed.
 */
export function toMiniAppViewer(
  miniApp
) {
  if (!miniApp) {
    return null;
  }

  return {
    id: miniApp.id,

    name:
      miniApp.name || '',

    slug:
      miniApp.slug || '',

    description:
      miniApp.description || '',

    icon:
      miniApp.icon || '',

    version:
      miniApp.version ||
      '1.0.0',

    entryType:
      miniApp.entryType ||
      'web',

    url:
      miniApp.url || '',

    entry:
      miniApp.entry || '',

    permissions:
      Array.isArray(
        miniApp.permissions
      )
        ? miniApp.permissions
        : [],

    features:
      Array.isArray(
        miniApp.features
      )
        ? miniApp.features
        : [],

    tags:
      Array.isArray(
        miniApp.tags
      )
        ? miniApp.tags
        : [],
  };
}

/**
 * Normalize mini-app creation input.
 */
export function normalizeMiniAppInput(
  appData = {}
) {
  return {
    ...appData,

    name: String(
      appData.name || ''
    ).trim(),

    slug:
      MiniAppFirebase.normalizeMiniAppSlug(
        appData.slug ||
        appData.name ||
        ''
      ),

    description: String(
      appData.description || ''
    ).trim(),

    shortDescription: String(
      appData.shortDescription || ''
    ).trim(),

    icon: String(
      appData.icon || ''
    ).trim(),

    banner: String(
      appData.banner || ''
    ).trim(),

    category:
      appData.category ||
      'Other',

    version:
      String(
        appData.version ||
        '1.0.0'
      ).trim(),

    entryType:
      appData.entryType ||
      'web',

    url:
      String(
        appData.url || ''
      ).trim(),

    entry:
      String(
        appData.entry || ''
      ).trim(),

    visibility:
      appData.visibility ||
      'public',

    status:
      appData.status ||
      'draft',

    permissions:
      Array.isArray(
        appData.permissions
      )
        ? appData.permissions
        : [],

    features:
      Array.isArray(
        appData.features
      )
        ? appData.features
        : [],

    tags:
      Array.isArray(
        appData.tags
      )
        ? appData.tags
        : [],
  };
}

/**
 * Frontend validation.
 *
 * This is NOT a security boundary.
 */
export function validateMiniAppInput(
  appData = {}
) {
  const errors = [];

  if (
    !appData.name ||
    !String(appData.name).trim()
  ) {
    errors.push(
      'Mini-app name is required.'
    );
  }

  if (
    String(
      appData.name || ''
    ).trim().length > 80
  ) {
    errors.push(
      'Mini-app name cannot exceed 80 characters.'
    );
  }

  if (
    appData.description &&
    String(
      appData.description
    ).length > 2000
  ) {
    errors.push(
      'Mini-app description cannot exceed 2000 characters.'
    );
  }

  const entryType =
    appData.entryType ||
    'web';

  const allowedEntryTypes = [
    'web',
    'declarative',
  ];

  if (
    !allowedEntryTypes.includes(
      entryType
    )
  ) {
    errors.push(
      'Unsupported mini-app entry type.'
    );
  }

  if (
    appData.permissions &&
    !Array.isArray(
      appData.permissions
    )
  ) {
    errors.push(
      'Permissions must be an array.'
    );
  }

  if (
    appData.features &&
    !Array.isArray(
      appData.features
    )
  ) {
    errors.push(
      'Features must be an array.'
    );
  }

  if (
    appData.tags &&
    !Array.isArray(
      appData.tags
    )
  ) {
    errors.push(
      'Tags must be an array.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

/**
 * Validate then create mini-app.
 */
export async function createValidatedMiniApp(
  appData
) {
  const normalized =
    normalizeMiniAppInput(
      appData
    );

  const validation =
    validateMiniAppInput(
      normalized
    );

  if (!validation.valid) {
    throw new Error(
      validation.errors.join(' ')
    );
  }

  const available =
    await isMiniAppSlugAvailable(
      normalized.slug
    );

  if (!available) {
    throw new Error(
      'This mini-app slug is already in use.'
    );
  }

  return createMiniApp(
    normalized
  );
}

/**
 * Update mini-app with frontend validation.
 */
export async function updateValidatedMiniApp(
  appId,
  updates = {}
) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  const normalized =
    normalizeMiniAppInput(
      updates
    );

  const validation =
    validateMiniAppInput(
      normalized
    );

  const errors =
    validation.errors.filter(
      (error) =>
        error !==
          'Mini-app name is required.'
    );

  if (errors.length > 0) {
    throw new Error(
      errors.join(' ')
    );
  }

  return updateMiniApp(
    appId,
    normalized
  );
}

/**
 * Filter mini-apps.
 */
export function filterMiniApps(
  miniApps = [],
  filters = {}
) {
  return MiniAppFirebase.filterMiniApps(
    miniApps,
    filters
  );
}

/**
 * Sort Portal mini-apps.
 */
export function sortMiniApps(
  miniApps = [],
  sortBy = 'popular'
) {
  const list = [...miniApps];

  switch (sortBy) {
    case 'rating':
      return list.sort(
        (a, b) =>
          Number(
            b.rating || 0
          ) -
          Number(
            a.rating || 0
          )
      );

    case 'installs':
    case 'popular':
      return list.sort(
        (a, b) =>
          Number(
            b.installs || 0
          ) -
          Number(
            a.installs || 0
          )
      );

    case 'usage':
      return list.sort(
        (a, b) =>
          Number(
            b.usageCount || 0
          ) -
          Number(
            a.usageCount || 0
          )
      );

    case 'views':
      return list.sort(
        (a, b) =>
          Number(
            b.views || 0
          ) -
          Number(
            a.views || 0
          )
      );

    default:
      return list;
  }
}

/**
 * Mini-App API object.
 */
export const MiniAppAPI = {
  getMiniApp,
  getMiniAppBySlug,

  getMyMiniApps,
  getOwnedMiniApps,

  getPublicMiniApps,
  getMiniAppsByCategory,

  getFeaturedMiniApps,
  getTrendingMiniApps,

  searchMiniApps,

  createMiniApp,
  createValidatedMiniApp,

  updateMiniApp,
  updateValidatedMiniApp,

  deleteMiniApp,

  isMiniAppSlugAvailable,

  publishMiniApp,
  unpublishMiniApp,
  suspendMiniApp,

  trackMiniAppView,
  trackMiniAppUsage,
  trackMiniAppInstall,
  trackMiniAppUninstall,

  getMiniAppStats,

  toPortalMiniApp,
  toMiniAppViewer,

  normalizeMiniAppInput,
  validateMiniAppInput,

  filterMiniApps,
  sortMiniApps,
};

export default MiniAppAPI;
