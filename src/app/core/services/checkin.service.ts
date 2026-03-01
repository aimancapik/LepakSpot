import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    increment,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    getDoc,
    onSnapshot,
    collectionData,
} from '@angular/fire/firestore';
import { CheckIn } from '../models/checkin.model';
import { AuthService } from './auth.service';
import { Observable, from, of } from 'rxjs';
import { signal } from '@angular/core';

export type DensityLevel = 'empty' | 'chill' | 'moderate' | 'busy' | 'packed';

export interface ActiveCheckIn {
    userId: string;
    displayName: string;
    photoURL: string;
    cafeId: string;
    timestamp: Timestamp;
}

export interface CafeDensity {
    cafeId: string;
    count: number;
    level: DensityLevel;
}

function getDensityLevel(count: number): DensityLevel {
    if (count === 0) return 'empty';
    if (count <= 3) return 'chill';
    if (count <= 8) return 'moderate';
    if (count <= 15) return 'busy';
    return 'packed';
}

const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable({ providedIn: 'root' })
export class CheckInService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);

    private readonly checkinsRef = collection(this.firestore, 'checkins');
    private readonly liveCheckinsRef = collection(this.firestore, 'live_checkins');
    private readonly usersRef = collection(this.firestore, 'users');

    // Live density map: cafeId -> density info
    densityMap = signal<Map<string, CafeDensity>>(new Map());
    // Active check-ins for the currently selected cafe
    activePeopleAtCafe = signal<ActiveCheckIn[]>([]);

    async checkIn(cafeId: string, cafeName: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const newDoc = doc(this.checkinsRef);
        const pointsEarned = 25;

        const checkin: CheckIn = {
            id: newDoc.id,
            userId: user.uid,
            cafeId,
            cafeName,
            timestamp: Timestamp.now(),
            pointsEarned,
        };

        await setDoc(newDoc, checkin);

        // Also update the live_checkins collection (auto-expires after 2h via client)
        const liveRef = doc(this.liveCheckinsRef, user.uid);
        const activeCheckin: ActiveCheckIn = {
            userId: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL || '',
            cafeId,
            timestamp: Timestamp.now(),
        };
        await setDoc(liveRef, activeCheckin);

        // Update user points and checkins
        const userRef = doc(this.usersRef, user.uid);
        await updateDoc(userRef, {
            points: increment(pointsEarned),
            totalCheckins: increment(1),
        });

        // Check and award badges
        await this.checkBadges(user.uid);

        // Refresh user data
        const updatedSnap = await getDoc(userRef);
        if (updatedSnap.exists()) {
            this.authService.currentUser.set({
                uid: user.uid,
                ...updatedSnap.data(),
            } as any);
        }
    }

    /**
     * Subscribe to real-time active check-ins for a specific cafe.
     * Returns an unsubscribe function.
     */
    watchCafe(cafeId: string): () => void {
        const twoHoursAgo = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
        const liveRef = this.liveCheckinsRef;
        const q = query(
            liveRef,
            where('cafeId', '==', cafeId),
            where('timestamp', '>=', twoHoursAgo)
        );
        return onSnapshot(q, (snapshot) => {
            const people = snapshot.docs.map(d => d.data() as ActiveCheckIn);
            this.activePeopleAtCafe.set(people);
        });
    }

    /**
     * Subscribe to all cafes' density in real time.
     * Returns an unsubscribe function.
     */
    watchAllDensity(): () => void {
        const twoHoursAgo = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
        const liveRef = this.liveCheckinsRef;
        const q = query(liveRef, where('timestamp', '>=', twoHoursAgo));
        return onSnapshot(q, (snapshot) => {
            const countMap = new Map<string, number>();
            snapshot.docs.forEach(d => {
                const data = d.data() as ActiveCheckIn;
                countMap.set(data.cafeId, (countMap.get(data.cafeId) || 0) + 1);
            });
            const densityMap = new Map<string, CafeDensity>();
            countMap.forEach((count, cafeId) => {
                densityMap.set(cafeId, { cafeId, count, level: getDensityLevel(count) });
            });
            this.densityMap.set(densityMap);
        });
    }

    getDensityForCafe(cafeId: string): CafeDensity {
        return this.densityMap().get(cafeId) ?? { cafeId, count: 0, level: 'empty' };
    }

    private async checkBadges(uid: string) {
        const userRef = doc(this.usersRef, uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const currentBadges: string[] = userData['badges'] || [];
        const totalCheckins: number = userData['totalCheckins'] || 0;
        const newBadges: string[] = [];

        if (totalCheckins >= 50 && !currentBadges.includes('Caffeine King')) {
            newBadges.push('Caffeine King');
        }
        if (totalCheckins >= 20 && !currentBadges.includes('Explorer')) {
            newBadges.push('Explorer');
        }

        const hour = new Date().getHours();
        if (hour < 9 && !currentBadges.includes('Early Bird')) {
            newBadges.push('Early Bird');
        }
        if (hour >= 22 && !currentBadges.includes('Night Owl')) {
            newBadges.push('Night Owl');
        }

        if (newBadges.length > 0) {
            await updateDoc(userRef, {
                badges: [...currentBadges, ...newBadges],
            });
        }
    }

    async hasCheckedInToday(cafeId: string): Promise<boolean> {
        const user = this.authService.currentUser();
        if (!user) return false;

        const twoHoursAgo = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
        const q = query(
            this.checkinsRef,
            where('userId', '==', user.uid),
            where('cafeId', '==', cafeId),
            where('timestamp', '>=', twoHoursAgo),
            limit(1)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    async getUserCheckins(uid: string): Promise<CheckIn[]> {
        const checkinsRef = this.checkinsRef;
        const q = query(
            checkinsRef,
            where('userId', '==', uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn));
    }
}
