const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

export function assertValidImageUpload(file: File): void {
    if (!file.type.startsWith('image/')) {
        throw new Error('Only image uploads are allowed.');
    }

    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Image must be 5MB or smaller.');
    }
}

export function createUserImagePath(userId: string, folder: string, file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const nonce = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `${userId}/${safeFolder}/${nonce}.${extension}`;
}

export function assertValidClaimDocument(file: File): void {
    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
        throw new Error('Upload a PDF, JPG, PNG, or WebP document.');
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
        throw new Error('Document must be 10MB or smaller.');
    }
}

export function createUserDocumentPath(userId: string, folder: string, file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const nonce = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `${userId}/${safeFolder}/${nonce}.${extension}`;
}
