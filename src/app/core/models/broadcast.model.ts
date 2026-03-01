import { Timestamp } from '@angular/fire/firestore';

export interface Broadcast {
    id: string;
    hostId: string;
    hostName: string; // denormalized for easy display
    cafeId: string;
    cafeName: string; // denormalized for easy display
    message: string;
    expiresAt: Timestamp;
    attendees: string[]; // array of user IDs
    createdAt: Timestamp;
}
