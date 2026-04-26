import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
    CafeTag, WifiSpeed, CrowdLevel, NoiseLevel, OutletAvailability
} from '../../../core/models/cafe.model';
import { Location, UpperCasePipe } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-add-cafe',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, UpperCasePipe],
    templateUrl: './add-cafe.component.html',
})
export class AddCafeComponent implements OnInit {
    private cafeService = inject(CafeService);
    private toastService = inject(ToastService);
    private authService = inject(AuthService);
    private supabase = inject(SupabaseService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(Location);

    // Edit mode
    editCafeId = signal<string | null>(null);
    isEditMode = signal(false);
    existingPhotoUrls = signal<string[]>([]); // already-uploaded URLs kept

    // ─── Required fields ───────────────────────────────────────────────
    name = signal('');
    address = signal('');

    // ─── Optional fields ───────────────────────────────────────────────
    openingHours = signal('');
    wifiSpeed = signal<WifiSpeed | ''>('');
    crowdLevel = signal<CrowdLevel | ''>('');
    noiseLevel = signal<NoiseLevel | ''>('');
    outletAvailability = signal<OutletAvailability | ''>('');
    isLateNight = signal(false);
    perksText = signal('');
    selectedTags = signal<CafeTag[]>([]);
    googleMapsUrl = signal('');
    tiktokUrl = signal('');
    facebookUrl = signal('');
    otherUrl = signal('');

    // ─── Photo upload ───────────────────────────────────────────────────
    photoPreviews = signal<string[]>([]);
    photoFiles = signal<File[]>([]);
    uploadingPhotos = signal(false);

    // ─── Scene Snaps ───────────────────────────────────────────────────
    sceneSnapFiles = signal<File[]>([]);
    sceneSnapPreviews = signal<string[]>([]);
    sceneSnapTags = signal<string[]>([]);

    // ─── Form state ─────────────────────────────────────────────────────
    submitting = signal(false);
    submitted = signal(false);
    pointsEarned = signal(0);
    isPreview = signal(false);
    touched = signal(false);

    // ─── Static option lists ────────────────────────────────────────────
    readonly allTags: { tag: CafeTag; label: string; icon: string }[] = [
        { tag: 'wifi', label: 'WiFi', icon: 'wifi' },
        { tag: 'halal', label: 'Halal', icon: 'verified' },
        { tag: 'aesthetic', label: 'Aesthetic', icon: 'auto_awesome' },
        { tag: 'study', label: 'Study Zone', icon: 'book' },
        { tag: 'chill', label: 'Chill Vibes', icon: 'potted_plant' },
    ];
    readonly wifiOptions: WifiSpeed[] = ['Fast', 'Average', 'Slow', 'None'];
    readonly crowdOptions: CrowdLevel[] = ['Empty', 'Moderate', 'Packed'];
    readonly noiseOptions: NoiseLevel[] = ['Library Quiet', 'Chill Chatter', 'Loud'];
    readonly outletOptions: OutletAvailability[] = ['Many', 'Few', 'None'];

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editCafeId.set(id);
            this.isEditMode.set(true);
            const cafe = await this.cafeService.getCafeById(id);
            if (cafe) {
                this.name.set(cafe.name);
                this.address.set(cafe.address);
                this.openingHours.set(cafe.openingHours || '');
                this.wifiSpeed.set(cafe.wifiSpeed || '');
                this.crowdLevel.set(cafe.crowdLevel || '');
                this.noiseLevel.set(cafe.noiseLevel || '');
                this.outletAvailability.set(cafe.outletAvailability || '');
                this.isLateNight.set(cafe.isLateNight || false);
                this.perksText.set((cafe.perks || []).join(', '));
                this.selectedTags.set(cafe.tags || []);
                this.googleMapsUrl.set(cafe.googleMapsUrl || '');
                this.tiktokUrl.set(cafe.socialLinks?.tiktok || '');
                this.facebookUrl.set(cafe.socialLinks?.facebook || '');
                this.otherUrl.set(cafe.socialLinks?.other || '');
                this.existingPhotoUrls.set(cafe.photos || []);
                this.photoPreviews.set(cafe.photos || []);
                // pre-fill scene snaps previews (URLs only, no files)
                if (cafe.sceneSnaps?.length) {
                    this.sceneSnapPreviews.set(cafe.sceneSnaps.map(s => s.url));
                    this.sceneSnapTags.set(cafe.sceneSnaps.map(s => s.tag));
                }
            }
        }
    }

    toggleTag(tag: CafeTag) {
        this.selectedTags.update(tags =>
            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
        );
    }
    isTagSelected(tag: CafeTag): boolean {
        return this.selectedTags().includes(tag);
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const newFiles = Array.from(input.files).slice(0, 4 - this.photoFiles().length);
        newFiles.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoPreviews.update(p => [...p, e.target!.result as string]);
            };
            reader.readAsDataURL(file);
            this.photoFiles.update(f => [...f, file]);
        });
        input.value = '';
    }

    removePhoto(index: number) {
        const preview = this.photoPreviews()[index];
        // If it's an existing URL (not a data URL), remove from existingPhotoUrls too
        if (!preview.startsWith('data:')) {
            this.existingPhotoUrls.update(urls => urls.filter(u => u !== preview));
        } else {
            // It's a new file — remove from photoFiles by matching index among new files
            const newFileIndex = this.photoPreviews().slice(0, index).filter(p => p.startsWith('data:')).length;
            this.photoFiles.update(f => f.filter((_, i) => i !== newFileIndex));
        }
        this.photoPreviews.update(p => p.filter((_, i) => i !== index));
    }

    onSceneSnapSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const newFiles = Array.from(input.files).slice(0, 5 - this.sceneSnapFiles().length);
        newFiles.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.sceneSnapPreviews.update(p => [...p, e.target!.result as string]);
            };
            reader.readAsDataURL(file);
            this.sceneSnapFiles.update(f => [...f, file]);
            this.sceneSnapTags.update(t => [...t, '']);
        });
        input.value = '';
    }

    removeSceneSnap(index: number) {
        this.sceneSnapPreviews.update(p => p.filter((_, i) => i !== index));
        this.sceneSnapFiles.update(f => f.filter((_, i) => i !== index));
        this.sceneSnapTags.update(t => t.filter((_, i) => i !== index));
    }

    updateSceneSnapTag(index: number, tag: string) {
        this.sceneSnapTags.update(tags => {
            const newTags = [...tags];
            newTags[index] = tag;
            return newTags;
        });
    }

    async uploadFiles(files: File[]): Promise<string[]> {
        const user = this.authService.currentUser();
        if (!user || files.length === 0) return [];
        const urls: string[] = [];
        for (const file of files) {
            const path = `${user.uid}/${Date.now()}-${file.name}`;
            const { data, error } = await this.supabase.client.storage
                .from('cafe-photos')
                .upload(path, file, { upsert: true });
            if (error) { console.error('Upload error:', error); continue; }
            const { data: urlData } = this.supabase.client.storage
                .from('cafe-photos')
                .getPublicUrl(data.path);
            urls.push(urlData.publicUrl);
        }
        return urls;
    }

    extractCoords(url: string): { lat: number; lng: number } | null {
        const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }
        return null;
    }

    onMapsUrlInput(value: string) { this.googleMapsUrl.set(value); }

    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.toastService.show('Geolocation not supported', 'error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.googleMapsUrl.set(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
                this.toastService.show('Location detected!', 'success');
            },
            () => this.toastService.show('Failed to get location', 'error')
        );
    }

    openGoogleMaps() { window.open('https://www.google.com/maps', '_blank'); }

    get nameErr(): string {
        return this.touched() && !this.name().trim() ? 'Cafe name is required' : '';
    }
    get addressErr(): string {
        return this.touched() && !this.address().trim() ? 'Address is required' : '';
    }
    canSubmit(): boolean {
        return this.name().trim().length > 0 && this.address().trim().length > 0 && !this.submitting();
    }

    async submit() {
        this.touched.set(true);
        if (!this.canSubmit()) return;
        this.submitting.set(true);
        try {
            this.uploadingPhotos.set(true);
            // Upload only new files (data URLs), keep existing URLs
            const newPhotoUrls = await this.uploadFiles(this.photoFiles());
            const finalPhotoUrls = [...this.existingPhotoUrls(), ...newPhotoUrls];

            // Scene snaps: keep existing URL entries + upload new files
            const existingSnaps = this.sceneSnapPreviews()
                .map((preview, i) => (!preview.startsWith('data:') ? { url: preview, tag: this.sceneSnapTags()[i] || 'Spot' } : null))
                .filter(Boolean) as { url: string; tag: string }[];
            const newSnapUrls = await this.uploadFiles(this.sceneSnapFiles());
            const newSnaps = newSnapUrls.map((url, i) => ({ url, tag: this.sceneSnapTags()[existingSnaps.length + i] || 'Spot' }));
            const sceneSnaps = [...existingSnaps, ...newSnaps];
            this.uploadingPhotos.set(false);

            const mapsUrl = this.googleMapsUrl().trim();
            const coords = mapsUrl ? this.extractCoords(mapsUrl) : null;
            const perks = this.perksText().trim()
                ? this.perksText().split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const cafeData = {
                name: this.name().trim(),
                address: this.address().trim(),
                tags: this.selectedTags(),
                openingHours: this.openingHours().trim() || undefined,
                wifiSpeed: this.wifiSpeed() || undefined,
                crowdLevel: this.crowdLevel() || undefined,
                noiseLevel: this.noiseLevel() || undefined,
                outletAvailability: this.outletAvailability() || undefined,
                isLateNight: this.isLateNight(),
                perks,
                photos: finalPhotoUrls,
                sceneSnaps,
                googleMapsUrl: mapsUrl || undefined,
                socialLinks: {
                    tiktok: this.tiktokUrl().trim() || undefined,
                    facebook: this.facebookUrl().trim() || undefined,
                    other: this.otherUrl().trim() || undefined,
                },
                lat: coords?.lat ?? 3.1390,
                lng: coords?.lng ?? 101.6869,
            };

            if (this.isEditMode() && this.editCafeId()) {
                await this.cafeService.updateCafe(this.editCafeId()!, cafeData);
                this.toastService.show('Cafe updated!', 'success');
                this.location.back();
            } else {
                await this.cafeService.submitCafe(cafeData);
                this.pointsEarned.set(100);
                this.submitted.set(true);
            }
        } catch (err) {
            console.error(err);
            this.uploadingPhotos.set(false);
            this.toastService.show('Failed to save. Please try again.', 'error');
        } finally {
            this.submitting.set(false);
        }
    }

    goBack() { this.location.back(); }
    goHome() { this.router.navigate(['/home']); }
}
