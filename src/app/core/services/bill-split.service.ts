import { Injectable, signal, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, getDocs } from '@angular/fire/firestore';
import { Bill, ReceiptItem } from '../models/bill.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class BillSplitService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);

    activeBill = signal<Bill | null>(null);

    // Unsubscribe function for the active bill listener
    private billUnsubscribe: (() => void) | null = null;

    constructor() { }

    async createBill(sessionId: string, items: ReceiptItem[], subtotal: number, tax: number, serviceCharge: number, total: number): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('User not authenticated');

        const billRef = doc(collection(this.firestore, `sessions/${sessionId}/bills`));
        const newBill: Bill = {
            id: billRef.id,
            sessionId,
            uploadedBy: user.uid,
            items,
            subtotal,
            tax,
            serviceCharge,
            total,
            createdAt: new Date() as any, // Firebase will use server timestamp eventually, using Date for local immediately
            updatedAt: new Date() as any
        };

        await setDoc(billRef, newBill);
        return billRef.id;
    }

    listenToBill(sessionId: string, billId: string) {
        if (this.billUnsubscribe) {
            this.billUnsubscribe();
        }

        const billRef = doc(this.firestore, `sessions/${sessionId}/bills/${billId}`);

        this.billUnsubscribe = onSnapshot(billRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Bill;
                // Keep ID consistent
                data.id = docSnap.id;
                this.activeBill.set(data);
            } else {
                this.activeBill.set(null);
            }
        }, (error) => {
            console.error('Error listening to bill updates:', error);
            this.activeBill.set(null);
        });
    }

    stopListening() {
        if (this.billUnsubscribe) {
            this.billUnsubscribe();
            this.billUnsubscribe = null;
        }
        this.activeBill.set(null);
    }

    async updateItemAssignment(sessionId: string, billId: string, itemId: string, assignedToIds: string[]) {
        const currentBill = this.activeBill();
        if (!currentBill) return;

        // We do a local optimistic update (handled by passing full items list)
        // and push to Firebase.
        const updatedItems = currentBill.items.map(item => {
            if (item.id === itemId) {
                return { ...item, assignedTo: assignedToIds };
            }
            return item;
        });

        const billRef = doc(this.firestore, `sessions/${sessionId}/bills/${billId}`);
        await updateDoc(billRef, {
            items: updatedItems,
            updatedAt: new Date() as any
        });
    }

    async updateBillDetails(sessionId: string, billId: string, updates: Partial<Bill>) {
        const billRef = doc(this.firestore, `sessions/${sessionId}/bills/${billId}`);
        await updateDoc(billRef, {
            ...updates,
            updatedAt: new Date() as any
        });
    }

    async getLatestBillForSession(sessionId: string): Promise<Bill | null> {
        const billsRef = collection(this.firestore, `sessions/${sessionId}/bills`);
        const snapshot = await getDocs(billsRef);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data() as Bill;
            data.id = doc.id;
            return data;
        }
        return null;
    }
}
