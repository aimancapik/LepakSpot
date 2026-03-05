export interface CafeList {
    id: string;
    title: string;
    description?: string;
    ownerId: string;
    collaboratorIds: string[];
    cafeIds: string[];
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}
