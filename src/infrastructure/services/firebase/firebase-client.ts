/**
 * Firebase SDK wrapper — lazy module loaders.
 *
 * `firebase/functions` and `firebase/firestore` are externalized by `tsup`
 * and lazy-loaded on first use. Centralizing the import here means:
 *   - The rest of the SDK never calls `await import('firebase/...')`
 *   - We can swap the underlying SDK version without touching call sites
 *   - Tests can replace this module with a mock
 *
 * The SDK instance objects (`functions`, `firestore`) are passed through
 * untouched; we do not own their lifecycle.
 *
 * The casts below are explicit boundary conversions: Firebase's generic
 * signatures are narrowed to the small structural surface this SDK relies
 * on. They are reviewed whenever the supported `firebase` peer range
 * changes.
 */

type FirebaseCallableFn<TData, TResult> = (data?: TData) => Promise<{ data: TResult }>;
type FirebaseHttpsCallable = <TData, TResult>(
  functions: unknown,
  name: string,
) => FirebaseCallableFn<TData, TResult>;

type FirebaseDocFn = (firestore: unknown, path: string, id: string) => unknown;

/**
 * `DocumentSnapshot` has shipped both as `exists: boolean` (property) and
 * `exists(): boolean` (method, current types) across Firebase majors —
 * accept either and normalize via `snapshotExists`.
 */
export interface FirebaseDocSnapshot {
  exists: boolean | (() => boolean);
  data(): unknown;
}

type FirebaseGetDocFn = (ref: unknown) => Promise<FirebaseDocSnapshot>;

export interface FirebaseFunctionsApi {
  httpsCallable: FirebaseHttpsCallable;
}

export interface FirebaseFirestoreApi {
  doc: FirebaseDocFn;
  getDoc: FirebaseGetDocFn;
}

/** Normalize `exists` across the property/method shapes. */
export function snapshotExists(snapshot: FirebaseDocSnapshot): boolean {
  return typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
}

/** Read the snapshot payload as a plain record (empty when absent). */
export function snapshotData(snapshot: FirebaseDocSnapshot): Record<string, unknown> {
  const data = snapshot.data();
  return data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

let functionsApiPromise: Promise<FirebaseFunctionsApi> | null = null;
let firestoreApiPromise: Promise<FirebaseFirestoreApi> | null = null;

export function loadFunctionsApi(): Promise<FirebaseFunctionsApi> {
  if (!functionsApiPromise) {
    // Do not cache a rejected load: a transient failure (or a late
    // `npm install firebase`) would otherwise stay broken for the app's
    // lifetime.
    functionsApiPromise = import('firebase/functions')
      .then((mod) => ({
        httpsCallable: mod.httpsCallable as unknown as FirebaseHttpsCallable,
      }))
      .catch((error: unknown) => {
        functionsApiPromise = null;
        throw error;
      });
  }
  return functionsApiPromise;
}

export function loadFirestoreApi(): Promise<FirebaseFirestoreApi> {
  if (!firestoreApiPromise) {
    firestoreApiPromise = import('firebase/firestore')
      .then((mod) => ({
        doc: mod.doc as unknown as FirebaseDocFn,
        getDoc: mod.getDoc as unknown as FirebaseGetDocFn,
      }))
      .catch((error: unknown) => {
        firestoreApiPromise = null;
        throw error;
      });
  }
  return firestoreApiPromise;
}
