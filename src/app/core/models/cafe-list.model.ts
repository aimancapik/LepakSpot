import { Timestamp } from '@angular/fire/firestore';

export interface CafeList {
    id: string;
    title: string;
    description?: string;
    ownerId: string;
    collaboratorIds: string[];
    cafeIds: string[];
    isPublic: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
