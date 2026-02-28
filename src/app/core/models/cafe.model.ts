import { Timestamp } from '@angular/fire/firestore';

export type CafeTag = 'wifi' | 'aesthetic' | 'halal' | 'study' | 'chill';

export interface Cafe {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    tags: CafeTag[];
    rating: number;
    photos: string[];
    addedBy: string;
    createdAt: Timestamp;
}
