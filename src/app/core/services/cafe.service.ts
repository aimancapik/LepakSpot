import { Injectable, inject, signal, computed } from '@angular/core';
import {
    Firestore,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { Cafe, CafeTag } from '../models/cafe.model';

const MOCK_CAFES: Cafe[] = [
    {
        id: 'mock-vcr',
        name: 'VCR Café',
        address: 'Jalan Rembia, Bukit Bintang, KL',
        tags: ['wifi', 'aesthetic'],
        rating: 4.8,
        lat: 3.1478,
        lng: 101.7125,
        photos: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
    },
    {
        id: 'mock-feeka',
        name: 'Feeka Coffee Roasters',
        address: 'Jalan Mesui, Bukit Bintang, KL',
        tags: ['aesthetic', 'chill'],
        rating: 4.6,
        lat: 3.1489,
        lng: 101.7098,
        photos: ['https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
    },
    {
        id: 'mock-lokl',
        name: 'LOKL Coffee Co.',
        address: 'Jalan Tun H S Lee, KL',
        tags: ['wifi', 'study', 'halal'],
        rating: 4.5,
        lat: 3.1466,
        lng: 101.6958,
        photos: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
    },
    {
        id: 'mock-pulp',
        name: 'Pulp by Papa Palheta',
        address: 'Jalan Scott, Brickfields, KL',
        tags: ['aesthetic', 'wifi'],
        rating: 4.7,
        lat: 3.1318,
        lng: 101.6873,
        photos: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
    },
    {
        id: 'mock-brew',
        name: 'The Brew Culture',
        address: 'Damansara Uptown, PJ',
        tags: ['halal', 'study', 'chill'],
        rating: 4.4,
        lat: 3.1358,
        lng: 101.6217,
        photos: ['https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=600&h=400&fit=crop'],
        addedBy: 'system',
        createdAt: Timestamp.now(),
    },
];

@Injectable({ providedIn: 'root' })
export class CafeService {
    private firestore = inject(Firestore);

    nearbyCafes = signal<Cafe[]>(MOCK_CAFES);
    selectedTags = signal<CafeTag[]>([]);

    filteredCafes = computed(() => {
        const tags = this.selectedTags();
        const cafes = this.nearbyCafes();
        if (tags.length === 0) return cafes;
        return cafes.filter((c) => tags.some((t) => c.tags.includes(t)));
    });

    toggleTag(tag: CafeTag) {
        this.selectedTags.update((tags) =>
            tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
        );
    }

    async getNearby(_lat?: number, _lng?: number, _radiusKm = 5) {
        try {
            const cafesRef = collection(this.firestore, 'cafes');
            const snapshot = await getDocs(cafesRef);
            if (snapshot.empty) {
                this.nearbyCafes.set(MOCK_CAFES);
            } else {
                const cafes = snapshot.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as Cafe)
                );
                this.nearbyCafes.set(cafes);
            }
        } catch {
            this.nearbyCafes.set(MOCK_CAFES);
        }
    }

    async getCafesByIds(ids: string[]): Promise<Cafe[]> {
        const results: Cafe[] = [];
        for (const id of ids) {
            const existing = this.nearbyCafes().find((c) => c.id === id);
            if (existing) {
                results.push(existing);
                continue;
            }
            try {
                const cafeDoc = await getDoc(doc(this.firestore, `cafes/${id}`));
                if (cafeDoc.exists()) {
                    results.push({ id: cafeDoc.id, ...cafeDoc.data() } as Cafe);
                }
            } catch {
                // skip
            }
        }
        return results;
    }
}
