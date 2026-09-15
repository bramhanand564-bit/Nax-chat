// firebase/miniApps.js

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

const MINI_APPS_COLLECTION = 'mini_apps';

/**
 * Normalize mini-app data before returning it to the UI.
 */
function normalizeMiniAppData(id, data = {}) {
  return {
    id,

    name: data.name || '',
    slug: data.slug || '',

    description: data.description || '',
    shortDescription: data.shortDescription || '',

    icon: data.icon || '',
    banner: data.banner || '',

    category: data.category || 'Other',

    version: data.version || '1.0.0',

    creatorId: data.creatorId || data.ownerId || '',
    ownerId: data.ownerId || data.creatorId || '',

    creatorName: data.creatorName || '',
    creatorUsername: data.creatorUsername || '',

    /**
     * web
     * declarative
     * native
     *
     * Native execution should NOT be trusted from Firestore.
     * Security validation will be handled separately.
     */
    entryType: data.entryType || 'web',

    url: data.url || '',
    entry: data.entry || '',

    /**
     * Public / private / draft / suspended
     */
    status: data.status || 'draft',

    /**
     * public / unlisted / private
     */
    visibility: data.visibility || 'public',

    permissions: Array.isArray(data.permissions)
      ? data.permissions
      : [],

    features: Array.isArray(data.features)
      ? data.features
      : [],

    tags: Array.isArray(data.tags)
      ? data.tags
      : [],

    installs: Number(data.installs || 0),
    views: Number(data.views || 0),
    usageCount: Number(data.usageCount || 0),

    rating: Number(data.rating || 0),
    ratingCount: Number(data.ratingCount || 0),

    featured: Boolean(data.featured),
    trending: Boolean(data.trending),

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    ...data,
    id,
  };
}

/**
 * Normalize slug.
 *
 * Example:
 * "My Movie Finder" -> "my-movie-finder"
 */
export function normalizeMiniAppSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Get a single mini-app by ID.
 */
export async function getMiniAppById(appId) {
  if (!appId) {
    throw new Error('Mini-app ID is required.');
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeMiniAppData(snapshot.id, snapshot.data());
}

/**
 * Get a mini-app by slug.
 */
export async function getMiniAppBySlug(slug) {
  const normalizedSlug = normalizeMiniAppSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('slug', '==', normalizedSlug),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const item = snapshot.docs[0];

  return normalizeMiniAppData(item.id, item.data());
}

/**
 * Create a new mini-app.
 */
export async function createMiniApp({
  creatorId,
  ownerId,
  name,
  slug,
  description = '',
  shortDescription = '',
  icon = '',
  banner = '',
  category = 'Other',
  version = '1.0.0',
  entryType = 'web',
  url = '',
  entry = '',
  permissions = [],
  features = [],
  tags = [],
  visibility = 'public',
  status = 'draft',
}) {
  if (!creatorId && !ownerId) {
    throw new Error('Creator ID is required.');
  }

  if (!name || !String(name).trim()) {
    throw new Error('Mini-app name is required.');
  }

  const finalSlug =
    normalizeMiniAppSlug(slug) ||
    normalizeMiniAppSlug(name);

  if (!finalSlug) {
    throw new Error('A valid mini-app slug is required.');
  }

  const existing = await getMiniAppBySlug(finalSlug);

  if (existing) {
    throw new Error('This mini-app slug is already in use.');
  }

  const finalOwnerId = ownerId || creatorId;
  const finalCreatorId = creatorId || ownerId;

  const payload = {
    name: String(name).trim(),
    slug: finalSlug,

    description: String(description || '').trim(),
    shortDescription: String(shortDescription || '').trim(),

    icon: String(icon || '').trim(),
    banner: String(banner || '').trim(),

    category: String(category || 'Other').trim(),

    version: String(version || '1.0.0').trim(),

    creatorId: finalCreatorId,
    ownerId: finalOwnerId,

    entryType: String(entryType || 'web').trim(),

    url: String(url || '').trim(),
    entry: String(entry || '').trim(),

    status: String(status || 'draft').trim(),
    visibility: String(visibility || 'public').trim(),

    permissions: Array.isArray(permissions)
      ? permissions
      : [],

    features: Array.isArray(features)
      ? features
      : [],

    tags: Array.isArray(tags)
      ? tags
      : [],

    installs: 0,
    views: 0,
    usageCount: 0,

    rating: 0,
    ratingCount: 0,

    featured: false,
    trending: false,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, MINI_APPS_COLLECTION),
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

/**
 * Update an existing mini-app.
 */
export async function updateMiniApp(appId, updates = {}) {
  if (!appId) {
    throw new Error('Mini-app ID is required.');
  }

  const cleanUpdates = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (cleanUpdates.slug) {
    cleanUpdates.slug = normalizeMiniAppSlug(
      cleanUpdates.slug
    );
  }

  if (Array.isArray(cleanUpdates.permissions) === false) {
    delete cleanUpdates.permissions;
  }

  if (Array.isArray(cleanUpdates.features) === false) {
    delete cleanUpdates.features;
  }

  if (Array.isArray(cleanUpdates.tags) === false) {
    delete cleanUpdates.tags;
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await updateDoc(ref, cleanUpdates);

  return getMiniAppById(appId);
}

/**
 * Delete a mini-app.
 */
export async function deleteMiniApp(appId) {
  if (!appId) {
    throw new Error('Mini-app ID is required.');
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await deleteDoc(ref);

  return true;
}

/**
 * Get mini-apps created by a user.
 */
export async function getUserMiniApps(userId) {
  if (!userId) {
    return [];
  }

  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('creatorId', '==', userId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
  );
}

/**
 * Get mini-apps owned by a user.
 */
export async function getOwnedMiniApps(userId) {
  if (!userId) {
    return [];
  }

  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('ownerId', '==', userId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
  );
}

/**
 * Get published public mini-apps.
 */
export async function getPublicMiniApps(limitCount = 50) {
  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
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

  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
  );
}

/**
 * Get featured mini-apps.
 */
export async function getFeaturedMiniApps(limitCount = 20) {
  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
  );
}

/**
 * Get trending mini-apps.
 *
 * Trending is controlled by backend/admin logic.
 */
export async function getTrendingMiniApps(limitCount = 20) {
  const miniAppsRef = collection(db, MINI_APPS_COLLECTION);

  const q = query(
    miniAppsRef,
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    where('trending', '==', true),
    orderBy('usageCount', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeMiniAppData(item.id, item.data())
  );
}

/**
 * Search mini-apps.
 *
 * Firestore does not provide full-text search.
 * This function gets public apps and performs a safe
 * local search across name, description, category and tags.
 */
export async function searchMiniApps(searchText = '', limitCount = 100) {
  const search = String(searchText || '')
    .trim()
    .toLowerCase();

  const apps = await getPublicMiniApps(limitCount);

  if (!search) {
    return apps;
  }

  return apps.filter((app) => {
    const searchableText = [
      app.name,
      app.slug,
      app.description,
      app.shortDescription,
      app.category,
      ...(Array.isArray(app.tags) ? app.tags : []),
      ...(Array.isArray(app.features) ? app.features : []),
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  });
}

/**
 * Filter mini-apps locally.
 */
export function filterMiniApps(
  miniApps = [],
  {
    category,
    creatorId,
    entryType,
    status,
    visibility,
    featured,
    trending,
    search,
  } = {}
) {
  const normalizedSearch = String(search || '')
    .trim()
    .toLowerCase();

  return miniApps.filter((app) => {
    if (category && app.category !== category) {
      return false;
    }

    if (creatorId && app.creatorId !== creatorId) {
      return false;
    }

    if (entryType && app.entryType !== entryType) {
      return false;
    }

    if (status && app.status !== status) {
      return false;
    }

    if (visibility && app.visibility !== visibility) {
      return false;
    }

    if (
      typeof featured === 'boolean' &&
      app.featured !== featured
    ) {
      return false;
    }

    if (
      typeof trending === 'boolean' &&
      app.trending !== trending
    ) {
      return false;
    }

    if (normalizedSearch) {
      const searchableText = [
        app.name,
        app.slug,
        app.description,
        app.shortDescription,
        app.category,
        ...(Array.isArray(app.tags) ? app.tags : []),
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Increment view count.
 */
export async function incrementMiniAppViews(appId) {
  if (!appId) {
    return false;
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await updateDoc(ref, {
    views: increment(1),
  });

  return true;
}

/**
 * Increment usage count.
 */
export async function incrementMiniAppUsage(appId) {
  if (!appId) {
    return false;
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await updateDoc(ref, {
    usageCount: increment(1),
  });

  return true;
}

/**
 * Increment install count.
 */
export async function incrementMiniAppInstalls(appId) {
  if (!appId) {
    return false;
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await updateDoc(ref, {
    installs: increment(1),
  });

  return true;
}

/**
 * Update install count.
 *
 * Useful later when uninstall support is added.
 */
export async function decrementMiniAppInstalls(appId) {
  if (!appId) {
    return false;
  }

  const ref = doc(db, MINI_APPS_COLLECTION, appId);

  await updateDoc(ref, {
    installs: increment(-1),
  });

  return true;
}

/**
 * Publish a mini-app.
 */
export async function publishMiniApp(appId) {
  return updateMiniApp(appId, {
    status: 'published',
    visibility: 'public',
  });
}

/**
 * Unpublish a mini-app.
 */
export async function unpublishMiniApp(appId) {
  return updateMiniApp(appId, {
    status: 'draft',
  });
}

/**
 * Suspend a mini-app.
 *
 * Intended for moderation/admin systems.
 */
export async function suspendMiniApp(appId) {
  return updateMiniApp(appId, {
    status: 'suspended',
  });
}

/**
 * Set featured state.
 *
 * Intended for admin/curation systems.
 */
export async function setMiniAppFeatured(
  appId,
  featured = true
) {
  return updateMiniApp(appId, {
    featured: Boolean(featured),
  });
}

/**
 * Set trending state.
 *
 * Intended for backend/admin logic.
 */
export async function setMiniAppTrending(
  appId,
  trending = true
) {
  return updateMiniApp(appId, {
    trending: Boolean(trending),
  });
}

/**
 * Check whether a slug is available.
 */
export async function isMiniAppSlugAvailable(slug) {
  const normalizedSlug = normalizeMiniAppSlug(slug);

  if (!normalizedSlug) {
    return false;
  }

  const existing = await getMiniAppBySlug(normalizedSlug);

  return !existing;
}

/**
 * Get basic mini-app statistics.
 */
export async function getMiniAppStats(appId) {
  const app = await getMiniAppById(appId);

  if (!app) {
    return null;
  }

  return {
    id: app.id,
    views: app.views,
    installs: app.installs,
    usageCount: app.usageCount,
    rating: app.rating,
    ratingCount: app.ratingCount,
  };
}

/**
 * Public API object.
 *
 * Makes migration/imports easier later.
 */
export const MiniAppFirebase = {
  normalizeMiniAppSlug,

  getMiniAppById,
  getMiniAppBySlug,

  createMiniApp,
  updateMiniApp,
  deleteMiniApp,

  getUserMiniApps,
  getOwnedMiniApps,

  getPublicMiniApps,
  getMiniAppsByCategory,
  getFeaturedMiniApps,
  getTrendingMiniApps,

  searchMiniApps,
  filterMiniApps,

  incrementMiniAppViews,
  incrementMiniAppUsage,
  incrementMiniAppInstalls,
  decrementMiniAppInstalls,

  publishMiniApp,
  unpublishMiniApp,
  suspendMiniApp,

  setMiniAppFeatured,
  setMiniAppTrending,

  isMiniAppSlugAvailable,
  getMiniAppStats,
};

export default MiniAppFirebase;
