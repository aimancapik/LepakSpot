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
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private router = inject(Router);
    private injector = inject(EnvironmentInjector);

    // Signal to store the current user's profile data
    currentUser = signal<User | null>(null);

    // Computed signal that returns true if a user is logged in
    isLoggedIn = computed(() => !!this.currentUser());

    // Signal to track the initial auth state check (usually on app load)
    loading = signal(true);

    // Signal to track the active sign-in process for UI feedback (e.g., loading spinners)
    isSigningIn = signal(false);

    constructor() {
        console.log('AuthService: Initializing...');

        // Listen for authentication state changes (login, logout, or session restoration)
        onAuthStateChanged(this.auth, async (firebaseUser) => {
            console.log('AuthService: Auth state changed, user:', firebaseUser?.email);

            if (firebaseUser) {
                try {
                    console.log('AuthService: Starting loadOrCreateUser for:', firebaseUser.uid);
                    // If a user is signed in with Firebase, sync their data with our Firestore database
                    await this.loadOrCreateUser(firebaseUser);
                    console.log('AuthService: User loaded/created successfully');
                } catch (error) {
                    console.error('AuthService: Error in loadOrCreateUser:', error);
                }
            } else {
                // If no Firebase user, clear the local user signal
                this.currentUser.set(null);
            }

            // Once the initial check is done, set loading to false to allow the app to render
            this.loading.set(false);
        });
    }

    /**
     * Synchronizes the Firebase Auth user with our 'users' collection in Firestore.
     * If numerical data or profile info exists, it loads it.
     * If it's a first-time user, it initializes their document.
     */
    private async loadOrCreateUser(firebaseUser: UserInfo): Promise<User> {
        // Prevent redundant loads if the user is already set
        const current = this.currentUser();
        if (current?.uid === firebaseUser.uid) {
            return current;
        }

        const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        console.log('AuthService: Fetching user document...');
        let userSnap;
        try {
            userSnap = await getDoc(userRef);
        } catch (error: any) {
            console.error('AuthService: Firestore fetch error:', error);
            if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('BLOCKED_BY_CLIENT')) {
                const blockedMsg = 'FireStore connection blocked or offline. Please disable any AdBlockers or VPNs for this site and refresh.';
                alert(blockedMsg);
                throw new Error(blockedMsg);
            }
            throw error;
        }

        let userData: User;
        if (userSnap && userSnap.exists()) {
            // User already exists in our database, update the local state with their data
            console.log('AuthService: User found in Firestore');
            userData = { uid: firebaseUser.uid, ...userSnap.data() } as User;
        } else {
            // New user detected! Create a default profile in Firestore
            console.log('AuthService: New user, creating Firestore document...');
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

            // Save the new user document to Firestore
            await setDoc(userRef, userData);
            console.log('AuthService: Firestore document created');
        }

        // Update local state
        this.currentUser.set(userData);
        return userData;
    }

    /**
     * Triggers the Google Sign-In popup flow.
     */
    async signIn() {
        console.log('AuthService: Sign-in requested');

        // Prevent multiple simultaneous sign-in attempts
        if (this.isSigningIn()) {
            console.warn('AuthService: Sign-in already in progress');
            return;
        }

        this.isSigningIn.set(true);
        try {
            const provider = new GoogleAuthProvider();
            console.log('AuthService: Opening Google popup...');

            // This opens the standard Google login window
            // Wrapping in runInInjectionContext to fix AngularFire context warnings
            const result = await runInInjectionContext(this.injector, () =>
                signInWithPopup(this.auth, provider)
            );
            console.log('AuthService: Popup success, user:', result.user.email);

            // CRITICAL: We must wait for the Firestore profile to be synced BEFORE navigating.
            // This prevents the AuthGuard from blocking the navigation to /home.
            console.log('AuthService: Syncing Firestore profile...');
            await runInInjectionContext(this.injector, () => this.loadOrCreateUser(result.user));
            console.log('AuthService: Profile sync completed');

            // Reset signing in state before navigation so components can update UI
            this.isSigningIn.set(false);

            // Once the profile is loaded, navigate the user to the home page
            console.log('AuthService: Navigating to /home...');
            await this.router.navigate(['/home']);
            console.log('AuthService: Navigation completed');
        } catch (error) {
            // Handle errors like user closing the popup or network issues
            console.error('AuthService: Sign-in error:', error);
            // Reset state on error
            this.isSigningIn.set(false);
            alert('Sign-in failed. Please check your browser console for details.');
        }
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
            this.currentUser.set(null);
            this.router.navigate(['/login']);
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    }

    /**
     * DEVELOPMENT ONLY: Bypasses the login flow and routes to home with a mock user.
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
            console.log('AuthService: Login bypassed with mock user');
            await this.router.navigate(['/home']);
        } catch (error) {
            console.error('Bypass error:', error);
        } finally {
            this.loading.set(false);
            this.isSigningIn.set(false);
        }
    }
}
