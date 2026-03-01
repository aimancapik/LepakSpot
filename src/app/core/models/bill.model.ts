import { Timestamp } from '@angular/fire/firestore';

export interface ReceiptItem {
    id: string;
    name: string;
    price: number;
    assignedTo: string[]; // Array of User IDs
}

export interface Bill {
    id?: string;
    sessionId: string;
    uploadedBy: string; // User ID
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
