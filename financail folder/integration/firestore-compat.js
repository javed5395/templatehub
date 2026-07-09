// ============================================================================
// firestore-compat.js  —  Integration Foundation, Layer 2
// LazyDogTemplates Marketplace
//
// The two engine families use INCOMPATIBLE Firestore SDK styles:
//   * commerce.js / seller.js / cart_core.js  -> Firebase v9 MODULAR
//       (getFirestore, collection(db,name), addDoc, getDoc, ...)
//   * sales-records_1.js / sales_record-2.js  -> Firebase v8 COMPAT (namespaced)
//       db.collection(name).doc(id).get()/set()/update(),
//       db.collection(name).where(f,op,v).get(),
//       window.firebase.firestore.FieldValue.serverTimestamp()
//
// Rather than rewrite either engine, this module builds a thin v8-compatible
// FACADE on top of a single v9 modular Firestore instance. Result: the whole
// system shares ONE Firebase app and ONE connection (the same one commerce.js
// opens), and the financial engine keeps its original v8 code untouched.
//
// Only the surface the engines actually use is implemented:
//   collection, doc, get, set, update, add, where  (+ orderBy/limit defensively)
//   window.firebase.firestore  (callable, with static .FieldValue)
// ============================================================================

/**
 * Wrap a v9 DocumentSnapshot so callers can use the v8 `.exists` PROPERTY
 * (v9 exposes `.exists()` as a method — the financial engine reads it as a
 * property, e.g. `if (!snap.exists)`).
 */
function wrapDocSnapshot(v9snap) {
  return {
    id: v9snap.id,
    exists: typeof v9snap.exists === "function" ? v9snap.exists() : !!v9snap.exists,
    data: () => (v9snap.data ? v9snap.data() : undefined),
    get: (field) => (v9snap.get ? v9snap.get(field) : undefined)
  };
}

/**
 * Wrap a v9 QuerySnapshot into the v8-shaped snapshot the engines iterate.
 */
function wrapQuerySnapshot(v9qsnap) {
  const docs = [];
  v9qsnap.forEach((d) => docs.push(wrapDocSnapshot(d)));
  return {
    size: docs.length,
    empty: docs.length === 0,
    docs,
    forEach: (cb) => docs.forEach((d) => cb(d))
  };
}

/**
 * Build a v8-style query object that accumulates constraints and executes via
 * the v9 `query()` + constraint helpers on `.get()`.
 */
function makeQuery(api, collRef, constraints) {
  const state = Array.isArray(constraints) ? constraints.slice() : [];
  const q = {
    where(field, op, value) {
      return makeQuery(api, collRef, state.concat([api.where(field, op, value)]));
    },
    orderBy(field, dir) {
      if (typeof api.orderBy === "function") {
        return makeQuery(api, collRef, state.concat([api.orderBy(field, dir || "asc")]));
      }
      return this;
    },
    limit(n) {
      if (typeof api.limit === "function") {
        return makeQuery(api, collRef, state.concat([api.limit(n)]));
      }
      return this;
    },
    async get() {
      const composed = state.length ? api.query(collRef, ...state) : api.query(collRef);
      const snap = await api.getDocs(composed);
      return wrapQuerySnapshot(snap);
    }
  };
  return q;
}

/**
 * v8-style DocumentReference over v9 doc().
 */
function makeDocRef(api, collRef, id) {
  const ref = api.doc(collRef, id);
  return {
    id,
    async get() {
      return wrapDocSnapshot(await api.getDoc(ref));
    },
    async set(data, options) {
      return api.setDoc(ref, data, options || {});
    },
    async update(data) {
      return api.updateDoc(ref, data);
    },
    async delete() {
      if (typeof api.deleteDoc === "function") return api.deleteDoc(ref);
    }
  };
}

/**
 * v8-style CollectionReference over v9 collection().
 */
function makeCollectionRef(api, db, name) {
  const collRef = api.collection(db, name);
  return {
    doc(id) {
      return makeDocRef(api, collRef, id);
    },
    where(field, op, value) {
      return makeQuery(api, collRef, [api.where(field, op, value)]);
    },
    orderBy(field, dir) {
      return makeQuery(api, collRef, []).orderBy(field, dir);
    },
    limit(n) {
      return makeQuery(api, collRef, []).limit(n);
    },
    async get() {
      const snap = await api.getDocs(api.query(collRef));
      return wrapQuerySnapshot(snap);
    },
    async add(data) {
      const ref = await api.addDoc(collRef, data);
      return { id: ref.id };
    }
  };
}

/**
 * Create the v8-compatible db facade.
 *
 * @param {Object} v9db  A v9 Firestore instance (from getFirestore()).
 * @param {Object} api   The v9 firestore module namespace (collection, doc,
 *                       getDoc, getDocs, setDoc, updateDoc, addDoc, query,
 *                       where, serverTimestamp, ...).
 * @returns {Object} v8-style db with .collection(name)
 */
export function createCompatDb(v9db, api) {
  if (!v9db) throw new Error("createCompatDb: a v9 Firestore instance is required.");
  if (!api || typeof api.collection !== "function") {
    throw new Error("createCompatDb: the v9 firestore API namespace is required.");
  }
  return {
    _v9db: v9db,
    _v9api: api,
    collection(name) {
      return makeCollectionRef(api, v9db, name);
    }
  };
}

/**
 * Build the v8-style `firebase.firestore` global the financial engine reads.
 * `firebase.firestore` is a CALLABLE that returns the compat db (cart_core's
 * fallback path uses `window.firebase.firestore()`), and also carries the
 * static `.FieldValue` helpers the engine uses
 * (`firebase.firestore.FieldValue.serverTimestamp()`).
 *
 * @param {Object} compatDb  from createCompatDb()
 * @param {Object} api       v9 firestore API namespace (for serverTimestamp/increment)
 * @returns {Object} a `firebase`-shaped object: { firestore }
 */
export function buildFirebaseCompatGlobal(compatDb, api) {
  const firestoreFn = function firestore() {
    return compatDb;
  };
  firestoreFn.FieldValue = {
    serverTimestamp: () => (typeof api.serverTimestamp === "function"
      ? api.serverTimestamp()
      : new Date()),
    increment: (n) => (typeof api.increment === "function"
      ? api.increment(n)
      : n),
    delete: () => (typeof api.deleteField === "function"
      ? api.deleteField()
      : null),
    arrayUnion: (...vals) => (typeof api.arrayUnion === "function"
      ? api.arrayUnion(...vals)
      : vals),
    arrayRemove: (...vals) => (typeof api.arrayRemove === "function"
      ? api.arrayRemove(...vals)
      : vals)
  };
  return { firestore: firestoreFn };
}

/**
 * Install the v8 firebase compat global onto a target (window/globalThis)
 * WITHOUT clobbering an existing real firebase namespace if one is present.
 *
 * @param {Object} compatDb
 * @param {Object} api
 * @param {Object} [target=globalThis]
 * @returns {Object} the installed firebase-shaped object
 */
export function installFirebaseCompatGlobal(compatDb, api, target) {
  const scope = target || (typeof window !== "undefined" ? window : globalThis);
  const compat = buildFirebaseCompatGlobal(compatDb, api);

  if (scope.firebase && typeof scope.firebase === "object") {
    // Preserve any existing firebase object; only fill the pieces the
    // financial engine needs if they are missing.
    if (typeof scope.firebase.firestore !== "function") {
      scope.firebase.firestore = compat.firestore;
    } else if (!scope.firebase.firestore.FieldValue) {
      scope.firebase.firestore.FieldValue = compat.firestore.FieldValue;
    }
  } else {
    scope.firebase = compat;
  }
  return scope.firebase;
}

export const FirestoreCompat = {
  createCompatDb,
  buildFirebaseCompatGlobal,
  installFirebaseCompatGlobal
};

export default FirestoreCompat;
