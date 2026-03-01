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
    arrayRemove,
    deleteDoc,
    getDoc,
    getDocs
} from '@angular/fire/firestore';
import { CafeList } from '../models/cafe-list.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CafeListService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private listsRef = collection(this.firestore, 'cafeLists');

    myLists = signal<CafeList[]>([]);
    sharedLists = signal<CafeList[]>([]);

    constructor() {
        // We could theoretically listen to auth state changes and re-subscribe,
        // but for now, we'll manually trigger loading when needed by the UI.
    }

    /**
     * Subscribe to lists owned by the user.
     */
    loadMyLists() {
        const user = this.authService.currentUser();
        if (!user) return;

        const q = query(this.listsRef, where('ownerId', '==', user.uid));
        onSnapshot(q, (snapshot) => {
            const lists = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CafeList));

            // Sort by updated time descending
            lists.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
            this.myLists.set(lists);
        });
    }

    /**
     * Subscribe to lists shared with the user.
     */
    loadSharedLists() {
        const user = this.authService.currentUser();
        if (!user) return;

        const q = query(this.listsRef, where('collaboratorIds', 'array-contains', user.uid));
        onSnapshot(q, (snapshot) => {
            const lists = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CafeList));

            // Sort by updated time descending
            lists.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
            this.sharedLists.set(lists);
        });
    }

    async createList(title: string, description: string = '', isPublic: boolean = false) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to create a list');

        const now = Timestamp.now();
        const newList: Omit<CafeList, 'id'> = {
            title,
            description,
            ownerId: user.uid,
            collaboratorIds: [],
            cafeIds: [],
            isPublic,
            createdAt: now,
            updatedAt: now
        };

        const docRef = await addDoc(this.listsRef, newList);
        return docRef.id;
    }

    async getListById(listId: string): Promise<CafeList | null> {
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        const snap = await getDoc(listRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as CafeList;
        }
        return null;
    }

    async addCafeToList(listId: string, cafeId: string) {
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        await updateDoc(listRef, {
            cafeIds: arrayUnion(cafeId),
            updatedAt: Timestamp.now()
        });
    }

    async removeCafeFromList(listId: string, cafeId: string) {
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        await updateDoc(listRef, {
            cafeIds: arrayRemove(cafeId),
            updatedAt: Timestamp.now()
        });
    }

    async addCollaborator(listId: string, userId: string) {
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        await updateDoc(listRef, {
            collaboratorIds: arrayUnion(userId),
            updatedAt: Timestamp.now()
        });
    }

    async removeCollaborator(listId: string, userId: string) {
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        await updateDoc(listRef, {
            collaboratorIds: arrayRemove(userId),
            updatedAt: Timestamp.now()
        });
    }

    async deleteList(listId: string) {
        // Backend rules should ensure only owner can delete
        const listRef = doc(this.firestore, `cafeLists/${listId}`);
        await deleteDoc(listRef);
    }
}
