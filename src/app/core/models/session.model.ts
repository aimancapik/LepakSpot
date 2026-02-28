import { Timestamp } from '@angular/fire/firestore';

export type SessionStatus = 'waiting' | 'voting' | 'done';

export interface Session {
    id: string;
    code: string;
    createdBy: string;
    members: string[];
    cafeOptions: string[];
    votes: Record<string, string>;
    status: SessionStatus;
    winnerId: string | null;
    createdAt: Timestamp;
}
