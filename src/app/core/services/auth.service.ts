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
import { SupabaseService } from './supabase.service';
import { User } from '../models/user.model';
import { ToastService } from '../../shared/components/toast/toast.service';
import { environment } from '../../../environments/environment';

const USER_CACHE_KEY = 'lepakspot_user_cache';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    private supabase = inject(SupabaseService);
    private router = inject(Router);
    private injector = inject(EnvironmentInjector);
    private toastService = inject(ToastService);

    currentUser = signal<User | null>(null);
    isGuest = signal<boolean>(false);
    isLoggedIn = computed(() => !!this.currentUser() || this.isGuest());
    loading = signal(true);
    isSigningIn = signal(false);

    constructor() {
        const cached = this.loadFromCache();
        if (cached) {
            this.currentUser.set(cached);
            this.loading.set(false);
        }

        const isGuest = localStorage.getItem('lepakspot_guest_mode') === 'true';
        if (isGuest) {
            this.isGuest.set(true);
        }

        onAuthStateChanged(this.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // If user logs in, they are definitely not a guest anymore
                this.isGuest.set(false);
                localStorage.removeItem('lepakspot_guest_mode');
                
                try {
                    await this.loadOrCreateUser(firebaseUser);
                } catch (error) {
                    console.error('AuthService: Error in loadOrCreateUser:', error);
                }
            } else {
                this.clearCache();
                this.currentUser.set(null);
            }
            this.loading.set(false);
        });
    }

    private saveToCache(user: User): void {
        try {
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        } catch {
            // Silently fail if localStorage is not available
        }
    }

    private loadFromCache(): User | null {
        try {
            const raw = localStorage.getItem(USER_CACHE_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as User;
        } catch {
            return null;
        }
    }

    private clearCache(): void {
        try {
            localStorage.removeItem(USER_CACHE_KEY);
        } catch {
            // Silently fail if localStorage is not available
        }
    }

    private async loadOrCreateUser(firebaseUser: UserInfo): Promise<User> {
        const current = this.currentUser();
        if (current?.uid === firebaseUser.uid) {
            this.refreshFromSupabase(firebaseUser).catch(err => console.error('AuthService: silent refresh failed', err));
            return current;
        }
        return this.refreshFromSupabase(firebaseUser);
    }

    private async refreshFromSupabase(firebaseUser: UserInfo): Promise<User> {
        try {
            const { data, error } = await this.supabase.client
                .from('users')
                .select('*')
                .eq('uid', firebaseUser.uid)
                .single();

            let userData: User;

            if (error || !data) {
                // User doesn't exist — create them
                userData = {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'Coffee Lover',
                    email: firebaseUser.email || '',
                    photoURL: firebaseUser.photoURL || '',
                    points: 0,
                    badges: [],
                    totalCheckins: 0,
                    isAdmin: false,
                    createdAt: new Date().toISOString(),
                };
                await this.supabase.client.from('users').insert(userData);
            } else {
                userData = data as User;
            }

            this.currentUser.set(userData);
            this.saveToCache(userData);
            return userData;
        } catch (err) {
            console.error('refreshFromSupabase failed:', err);
            // Fallback to cache or minimal user
            const cached = this.loadFromCache();
            if (cached?.uid === firebaseUser.uid) return cached;
            const fallback: User = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                points: 0,
                badges: [],
                totalCheckins: 0,
                isAdmin: false,
                createdAt: new Date().toISOString(),
            };
            this.currentUser.set(fallback);
            return fallback;
        }
    }

    async refreshCurrentUser(): Promise<void> {
        const user = this.currentUser();
        if (!user) return;
        try {
            const { data } = await this.supabase.client
                .from('users')
                .select('*')
                .eq('uid', user.uid)
                .single();
            if (data) {
                const updated = data as User;
                this.currentUser.set(updated);
                this.saveToCache(updated);
            }
        } catch (e) {
            console.error('refreshCurrentUser failed:', e);
        }
    }

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
            this.toastService.show('Sign-in failed. Please try again.', 'error');
        }
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
            this.clearCache();
            this.currentUser.set(null);
            this.isGuest.set(false);
            localStorage.removeItem('lepakspot_guest_mode');
            this.router.navigate(['/login']);
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    }

    continueAsGuest() {
        this.isGuest.set(true);
        localStorage.setItem('lepakspot_guest_mode', 'true');
        this.router.navigate(['/home']);
    }

    async bypassLogin() {
        if (!environment.enableDevBypass || environment.production) {
            throw new Error('Developer bypass is disabled in this build.');
        }

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
                createdAt: new Date().toISOString()
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
