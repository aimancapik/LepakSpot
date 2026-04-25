export type SessionStatus = 'waiting' | 'voting' | 'done';

export interface MemberLocation {
    lat: number;
    lng: number;
}

export interface Session {
    id: string;
    code: string;
    createdBy: string;
    members: string[];
    cafeOptions: string[];
    votes: Record<string, string>;
    status: SessionStatus;
    winnerId: string | null;
    createdAt: string;
    meetInMiddle?: boolean;
    memberLocations?: Record<string, MemberLocation>;
}
