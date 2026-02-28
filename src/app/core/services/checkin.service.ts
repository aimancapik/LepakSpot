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
} from '@angular/fire/firestore';
import { CheckIn } from '../models/checkin.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CheckInService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);

    async checkIn(cafeId: string, cafeName: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const checkinsRef = collection(this.firestore, 'checkins');
        const newDoc = doc(checkinsRef);
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

        // Update user points and checkins
        const userRef = doc(this.firestore, `users/${user.uid}`);
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

    private async checkBadges(uid: string) {
        const userRef = doc(this.firestore, `users/${uid}`);
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

        // Time-based badges
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

    async getUserCheckins(uid: string): Promise<CheckIn[]> {
        const checkinsRef = collection(this.firestore, 'checkins');
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
