import { Injectable, inject, signal, computed, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import {
    Auth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged,
    type UserInfo,
} from '@angular/fire/auth';
import {
    Firestore,
    collection,
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { User } from '../models/user.model';

const USER_CACHE_KEY = 'lepakspot_user_cache';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private router = inject(Router);
    private injector = inject(EnvironmentInjector);

    private readonly usersRef = collection(this.firestore, 'users');

    // Signal to store the current user's profile data
    currentUser = signal<User | null>(null);

    // Computed signal that returns true if a user is logged in
    isLoggedIn = computed(() => !!this.currentUser());

    // Signal to track the initial auth state check
    // Starts as false if we have a cached user, so the app renders instantly
    loading = signal(true);

    // Signal to track the active sign-in process for UI feedback
    isSigningIn = signal(false);

    constructor() {
        // ── Step 1: Restore from cache instantly (synchronous) ──
        const cached = this.loadFromCache();
        if (cached) {
            this.currentUser.set(cached);
            this.loading.set(false); // don't block the UI — we already have data
        }

        // ── Step 2: Once Firebase Auth resolves, sync with Firestore in background ──
        onAuthStateChanged(this.auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    await this.loadOrCreateUser(firebaseUser);
                } catch (error) {
                    console.error('AuthService: Error in loadOrCreateUser:', error);
                }
            } else {
                // Logged out — clear cache and user
                this.clearCache();
                this.currentUser.set(null);
            }
            // Only set loading false here if we didn't already do it from cache
            this.loading.set(false);
        });
    }

    // ── Cache helpers ────────────────────────────────────────────────────────
    private saveToCache(user: User): void {
        try {
            // Timestamps aren't JSON-serializable directly; convert to millis
            const serializable = {
                ...user,
                createdAt: (user.createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
            };
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(serializable));
        } catch (e) {
            // localStorage unavailable (e.g. private browsing with restrictions) — ignore
        }
    }

    private loadFromCache(): User | null {
        try {
            const raw = localStorage.getItem(USER_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Re-hydrate Timestamp from millis
            return {
                ...parsed,
                createdAt: Timestamp.fromMillis(parsed.createdAt ?? 0),
            } as User;
        } catch (e) {
            return null;
        }
    }

    private clearCache(): void {
        try {
            localStorage.removeItem(USER_CACHE_KEY);
        } catch (e) { }
    }

    // ── Firestore sync ───────────────────────────────────────────────────────
    private async loadOrCreateUser(firebaseUser: UserInfo): Promise<User> {
        const current = this.currentUser();
        if (current?.uid === firebaseUser.uid) {
            // Already have the right user from cache — do a background refresh but don't block
            this.refreshFromFirestore(firebaseUser).catch(() => { });
            return current;
        }

        return this.refreshFromFirestore(firebaseUser);
    }

    private async refreshFromFirestore(firebaseUser: UserInfo): Promise<User> {
        const userRef = doc(this.usersRef, firebaseUser.uid);
        let userSnap;
        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timed out')), 10000)
            );
            userSnap = await Promise.race([getDoc(userRef), timeout]);
        } catch (error: any) {
            if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('timed out')) {
                // Offline — keep using the cached user, don't overwrite
                const cached = this.loadFromCache();
                if (cached?.uid === firebaseUser.uid) return cached;
                // Fallback minimal user from Firebase Auth data
                const fallback: User = {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    photoURL: firebaseUser.photoURL || '',
                    points: 0,
                    badges: [],
                    totalCheckins: 0,
                    createdAt: Timestamp.now(),
                };
                this.currentUser.set(fallback);
                return fallback;
            }
            throw error;
        }

        let userData: User;
        if (userSnap && userSnap.exists()) {
            userData = { uid: firebaseUser.uid, ...userSnap.data() } as User;
        } else {
            userData = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Coffee Lover',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                points: 0,
                badges: [],
                totalCheckins: 0,
                createdAt: Timestamp.now(),
            };
            await setDoc(userRef, userData);
        }

        this.currentUser.set(userData);
        this.saveToCache(userData); // ← persist fresh data for next startup
        return userData;
    }

    /**
     * Re-fetches user profile from Firestore and updates the signal + cache.
     * Call this after operations that change points/streak etc.
     */
    async refreshCurrentUser(): Promise<void> {
        const user = this.currentUser();
        if (!user) return;
        try {
            const userRef = doc(this.usersRef, user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const updated = { uid: user.uid, ...snap.data() } as User;
                this.currentUser.set(updated);
                this.saveToCache(updated);
            }
        } catch (e) {
            console.error('refreshCurrentUser failed:', e);
        }
    }

    /**
     * Triggers the Google Sign-In popup flow.
     */
    async signIn() {
        if (this.isSigningIn()) return;
        this.isSigningIn.set(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await runInInjectionContext(this.injector, () =>
                signInWithPopup(this.auth, provider)
            );
            await runInInjectionContext(this.injector, () => this.loadOrCreateUser(result.user));
            this.isSigningIn.set(false);
            await this.router.navigate(['/home']);
        } catch (error) {
            console.error('AuthService: Sign-in error:', error);
            this.isSigningIn.set(false);
            alert('Sign-in failed. Please check your browser console for details.');
        }
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
            this.clearCache();
            this.currentUser.set(null);
            this.router.navigate(['/login']);
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    }

    /**
     * DEVELOPMENT ONLY: Bypasses the login flow with a mock user.
     */
    async bypassLogin() {
        this.loading.set(true);
        try {
            const mockUser: User = {
                uid: 'dev-bypass-user',
                displayName: 'Dev Tester',
                email: 'dev@lepakspot.com',
                photoURL: 'https://ui-avatars.com/api/?name=Dev+Tester',
                points: 0,
                badges: [],
                totalCheckins: 0,
                createdAt: Timestamp.now()
            };
            this.currentUser.set(mockUser);
            this.saveToCache(mockUser);
            await this.router.navigate(['/home']);
        } catch (error) {
            console.error('Bypass error:', error);
        } finally {
            this.loading.set(false);
            this.isSigningIn.set(false);
        }
    }
}
