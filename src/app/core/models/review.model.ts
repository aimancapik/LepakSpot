export interface Review {
    id: string;
    cafeId: string;
    userId: string;
    displayName: string;
    photoURL: string;
    rating: number; // 1–5
    text: string;
    imageUrl?: string;
    likeCount: number;
    createdAt: string;
}
