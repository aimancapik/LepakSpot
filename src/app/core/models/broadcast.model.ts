export interface Broadcast {
    id: string;
    hostId: string;
    hostName: string;
    cafeId: string;
    cafeName: string;
    message: string;
    expiresAt: string;
    attendees: string[];
    createdAt: string;
}
