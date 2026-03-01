import { Injectable, inject, signal } from '@angular/core';
import {
    Firestore,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    arrayUnion,
    Timestamp,
    type Unsubscribe,
} from '@angular/fire/firestore';
import { Session } from '../models/session.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);

    private readonly sessionsRef = collection(this.firestore, 'sessions');

    activeSession = signal<Session | null>(null);
    private unsubscribe: Unsubscribe | null = null;

    private generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async createSession(cafeIds: string[]): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const newDocRef = doc(this.sessionsRef);
        const code = this.generateCode();

        const session: Session = {
            id: newDocRef.id,
            code,
            createdBy: user.uid,
            members: [user.uid],
            cafeOptions: cafeIds,
            votes: {},
            status: 'waiting',
            winnerId: null,
            createdAt: Timestamp.now(),
        };

        await setDoc(newDocRef, session);
        this.activeSession.set(session);
        this.listenSession(newDocRef.id);
        return newDocRef.id;
    }

    async joinSession(code: string): Promise<string | null> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const q = query(this.sessionsRef, where('code', '==', code.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const sessionDoc = snapshot.docs[0];
        const sessionId = sessionDoc.id;

        await updateDoc(doc(this.sessionsRef, sessionId), {
            members: arrayUnion(user.uid),
        });

        this.listenSession(sessionId);
        return sessionId;
    }

    listenSession(id: string) {
        if (this.unsubscribe) this.unsubscribe();

        const sessionRef = doc(this.sessionsRef, id);
        this.unsubscribe = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
                this.activeSession.set({ id: snap.id, ...snap.data() } as Session);
            }
        });
    }

    async castVote(sessionId: string, cafeId: string) {
        const user = this.authService.currentUser();
        if (!user) return;

        const sessionRef = doc(this.sessionsRef, sessionId);
        await updateDoc(sessionRef, {
            [`votes.${user.uid}`]: cafeId,
        });

        // Check if all members voted
        const freshSnap = await getDoc(sessionRef);
        if (freshSnap.exists()) {
            const data = freshSnap.data() as Session;
            const totalMembers = data.members.length;
            const totalVotes = Object.keys(data.votes).length;

            if (totalVotes >= totalMembers) {
                // Calculate winner
                const voteCounts: Record<string, number> = {};
                Object.values(data.votes).forEach((cId) => {
                    voteCounts[cId] = (voteCounts[cId] || 0) + 1;
                });
                const winnerId = Object.entries(voteCounts).sort(
                    (a, b) => b[1] - a[1]
                )[0][0];

                await updateDoc(sessionRef, {
                    status: 'done',
                    winnerId,
                });
            }
        }
    }

    async startVoting(sessionId: string) {
        const sessionRef = doc(this.sessionsRef, sessionId);
        await updateDoc(sessionRef, { status: 'voting' });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.activeSession.set(null);
    }
}
