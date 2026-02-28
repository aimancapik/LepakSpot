import { Timestamp } from '@angular/fire/firestore';

export interface CheckIn {
    id: string;
    userId: string;
    cafeId: string;
    cafeName: string;
    timestamp: Timestamp;
    pointsEarned: number;
}
