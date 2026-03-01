import { Injectable, inject, signal } from '@angular/core';
import {
    Firestore,
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    Timestamp,
    doc,
    updateDoc,
    arrayUnion,
    deleteDoc,
    getDocs
} from '@angular/fire/firestore';
import { Broadcast } from '../models/broadcast.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BroadcastService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private broadcastsRef = collection(this.firestore, 'broadcasts');

    activeBroadcasts = signal<Broadcast[]>([]);

    constructor() {
        this.listenToActiveBroadcasts();
    }

    private listenToActiveBroadcasts() {
        // In a real app we might only listen to broadcasts from 'friends'
        // For the MVP, we'll listen to all active broadcasts
        const now = Timestamp.now();
        const q = query(
            this.broadcastsRef,
            where('expiresAt', '>', now)
        );

        onSnapshot(q, (snapshot) => {
            const broadcasts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Broadcast));

            // Sort by newest first
            broadcasts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            this.activeBroadcasts.set(broadcasts);
        });
    }

    async createBroadcast(cafeId: string, cafeName: string, message: string, hoursValid: number = 3) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to broadcast');

        const now = new Date();
        const expiresAt = new Date(now.getTime() + hoursValid * 60 * 60 * 1000);

        const newBroadcast: Omit<Broadcast, 'id'> = {
            hostId: user.uid,
            hostName: user.displayName || 'Anonymous',
            cafeId,
            cafeName,
            message,
            expiresAt: Timestamp.fromDate(expiresAt),
            createdAt: Timestamp.fromDate(now),
            attendees: [user.uid] // host is automatically an attendee
        };

        const docRef = await addDoc(this.broadcastsRef, newBroadcast);
        return docRef.id;
    }

    async joinBroadcast(broadcastId: string) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to join');

        const bRef = doc(this.firestore, `broadcasts/${broadcastId}`);
        await updateDoc(bRef, {
            attendees: arrayUnion(user.uid)
        });
    }

    async deleteBroadcast(broadcastId: string) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to delete');

        // In reality, we should check if user.uid === broadcast.hostId via backend rules
        const bRef = doc(this.firestore, `broadcasts/${broadcastId}`);
        await deleteDoc(bRef);
    }
}
