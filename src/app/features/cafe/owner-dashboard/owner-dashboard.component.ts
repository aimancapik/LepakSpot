import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { DealService } from '../../../core/services/deal.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe, CafeTag, DayKey, DayHours, OperatingHours, WifiSpeed, OutletAvailability, MenuItem } from '../../../core/models/cafe.model';
import { Deal } from '../../../core/models/deal.model';
import { Review } from '../../../core/models/review.model';
import { SupabaseService } from '../../../core/services/supabase.service';
import { assertValidImageUpload, assertValidVideoUpload, createUserImagePath, createUserMediaPath } from '../../../core/utils/image-upload';

export type DashboardTab = 'overview' | 'reviews' | 'menu' | 'deals' | 'traffic';

@Component({
    selector: 'app-owner-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    private cafeService = inject(CafeService);
    private dealService = inject(DealService);
    private reviewService = inject(ReviewService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);
    private supabase = inject(SupabaseService);

    cafe = signal<Cafe | null>(null);
    deals = signal<Deal[]>([]);
    reviews = signal<Review[]>([]);
    stats = signal<{ totalCheckins: number; totalSessions: number; avgRating: number } | null>(null);

    activeTab = signal<DashboardTab>('overview');
    saving = signal(false);
    loading = signal(true);

    // Overview edit form
    editName = signal('');
    editAddress = signal('');
    editOpeningHours = signal('');
    editOperatingHours = signal<Partial<OperatingHours>>({});

    readonly weekDays: { key: DayKey; label: string }[] = [
        { key: 'mon', label: 'Mon' },
        { key: 'tue', label: 'Tue' },
        { key: 'wed', label: 'Wed' },
        { key: 'thu', label: 'Thu' },
        { key: 'fri', label: 'Fri' },
        { key: 'sat', label: 'Sat' },
        { key: 'sun', label: 'Sun' },
    ];
    editTags = signal<CafeTag[]>([]);
    editIsLateNight = signal(false);
    editWifiSpeed = signal<WifiSpeed | ''>('');
    editOutletAvailability = signal<OutletAvailability | ''>('');
    existingPhotoUrls = signal<string[]>([]);
    photoPreviews = signal<string[]>([]);
    photoFiles = signal<File[]>([]);
    existingVideoUrl = signal('');
    videoPreview = signal('');
    videoFile = signal<File | null>(null);
    uploadingPhotos = signal(false);
    sceneSnapFiles = signal<File[]>([]);
    sceneSnapPreviews = signal<string[]>([]);
    sceneSnapTags = signal<string[]>([]);
    menuItems = signal<MenuItem[]>([]);
    menuItemFiles = signal<(File | null)[]>([]);
    menuItemPreviews = signal<string[]>([]);
    readonly menuCategorySuggestions = ['Coffee', 'Tea', 'Food', 'Pastry', 'Cold Drinks', 'Dessert'];

    // Deal form
    showDealForm = signal(false);
    newDealTitle = signal('');
    newDealDescription = signal('');
    newDealValidFrom = signal('');
    newDealValidUntil = signal('');

    readonly allTags: CafeTag[] = ['wifi', 'aesthetic', 'halal', 'study', 'chill'];

    isOwner = computed(() => {
        const user = this.authService.currentUser();
        const cafe = this.cafe();
        return !!user && !!cafe && cafe.ownerId === user.uid && cafe.claimStatus === 'claimed';
    });

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.router.navigate(['/home']); return; }

        const cafe = await this.cafeService.getCafeById(id);
        if (!cafe) { this.router.navigate(['/home']); return; }

        const user = this.authService.currentUser();
        if (!user || cafe.ownerId !== user.uid || cafe.claimStatus !== 'claimed') {
            this.toastService.show('Only the cafe owner can access this dashboard.', 'error');
            this.router.navigate(['/cafe', id]);
            return;
        }

        this.cafe.set(cafe);
        this.syncEditForm(cafe);
        this.loading.set(false);

        // Load all tabs in parallel
        const [deals, , stats] = await Promise.all([
            this.dealService.getDealsForCafe(id),
            this.reviewService.loadReviewsForCafe(id),
            this.cafeService.getOwnerStats(id),
        ]);
        this.deals.set(deals);
        this.reviews.set(this.reviewService.cafeReviews());
        this.stats.set(stats);
    }

    private syncEditForm(cafe: Cafe) {
        this.editName.set(cafe.name);
        this.editAddress.set(cafe.address);
        this.editOpeningHours.set(cafe.openingHours || '');
        this.editOperatingHours.set(cafe.operatingHours ? { ...cafe.operatingHours } : this.defaultOperatingHours());
        this.editTags.set([...cafe.tags]);
        this.editIsLateNight.set(cafe.isLateNight || false);
        this.editWifiSpeed.set(cafe.wifiSpeed || '');
        this.editOutletAvailability.set(cafe.outletAvailability || '');
        this.existingPhotoUrls.set(cafe.photos || []);
        this.photoPreviews.set(cafe.photos || []);
        this.existingVideoUrl.set(cafe.videoUrl || '');
        this.videoPreview.set(cafe.videoUrl || '');
        this.sceneSnapPreviews.set((cafe.sceneSnaps || []).map(s => s.url));
        this.sceneSnapTags.set((cafe.sceneSnaps || []).map(s => s.tag));
        this.menuItems.set((cafe.menu || []).map(m => ({ ...m })));
        this.menuItemFiles.set((cafe.menu || []).map(() => null));
        this.menuItemPreviews.set((cafe.menu || []).map(m => m.photoUrl || ''));
    }

    addMenuItem() {
        this.menuItems.update(items => [...items, { name: '', price: 0, category: '' }]);
        this.menuItemFiles.update(f => [...f, null]);
        this.menuItemPreviews.update(p => [...p, '']);
    }

    removeMenuItem(index: number) {
        this.menuItems.update(items => items.filter((_, i) => i !== index));
        this.menuItemFiles.update(f => f.filter((_, i) => i !== index));
        this.menuItemPreviews.update(p => p.filter((_, i) => i !== index));
    }

    updateMenuItemField(index: number, field: 'name' | 'category', value: string) {
        this.menuItems.update(items => {
            const next = [...items];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }

    updateMenuItemPrice(index: number, value: string) {
        const num = parseFloat(value);
        this.menuItems.update(items => {
            const next = [...items];
            next[index] = { ...next[index], price: isNaN(num) ? 0 : num };
            return next;
        });
    }

    onMenuItemPhotoSelected(index: number, event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            assertValidImageUpload(file);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Invalid image upload.';
            this.toastService.show(msg, 'error');
            input.value = '';
            return;
        }
        this.menuItemFiles.update(f => {
            const next = [...f];
            next[index] = file;
            return next;
        });
        const reader = new FileReader();
        reader.onload = (e) => {
            this.menuItemPreviews.update(p => {
                const next = [...p];
                next[index] = e.target!.result as string;
                return next;
            });
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    removeMenuItemPhoto(index: number) {
        this.menuItemFiles.update(f => {
            const next = [...f];
            next[index] = null;
            return next;
        });
        this.menuItemPreviews.update(p => {
            const next = [...p];
            next[index] = '';
            return next;
        });
        this.menuItems.update(items => {
            const next = [...items];
            next[index] = { ...next[index], photoUrl: undefined };
            return next;
        });
    }

    async saveMenu() {
        const cafe = this.cafe();
        if (!cafe) return;
        this.saving.set(true);
        try {
            const rawMenu = this.menuItems();
            const menuFiles = this.menuItemFiles();
            const menuPreviews = this.menuItemPreviews();
            const menu: MenuItem[] = [];
            for (let i = 0; i < rawMenu.length; i++) {
                const item = rawMenu[i];
                if (!item.name.trim()) continue;
                let photoUrl = item.photoUrl;
                const file = menuFiles[i];
                if (file) {
                    const [url] = await this.uploadFiles([file]);
                    photoUrl = url || undefined;
                } else if (menuPreviews[i] && !menuPreviews[i].startsWith('data:')) {
                    photoUrl = menuPreviews[i];
                } else if (!menuPreviews[i]) {
                    photoUrl = undefined;
                }
                menu.push({
                    name: item.name.trim(),
                    price: Number.isFinite(item.price) ? item.price : 0,
                    category: item.category?.trim() || undefined,
                    photoUrl,
                });
            }
            await this.cafeService.updateCafeAsOwner(cafe.id, { menu });
            this.menuItems.set(menu.map(m => ({ ...m })));
            this.menuItemFiles.set(menu.map(() => null));
            this.menuItemPreviews.set(menu.map(m => m.photoUrl || ''));
            this.cafe.update(c => c ? { ...c, menu } : c);
            this.toastService.show('Menu updated!', 'success');
        } catch {
            this.toastService.show('Save failed. Try again.', 'error');
        } finally {
            this.saving.set(false);
        }
    }

    toggleEditTag(tag: CafeTag) {
        this.editTags.update(tags =>
            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
        );
    }

    toggleLateNight() {
        this.editIsLateNight.update(v => !v);
    }

    toggleDealForm() {
        this.showDealForm.update(v => !v);
    }

    async saveOverview() {
        const cafe = this.cafe();
        if (!cafe) return;
        this.saving.set(true);
        try {
            this.uploadingPhotos.set(true);
            const newPhotoUrls = await this.uploadFiles(this.photoFiles());
            const finalPhotoUrls = [...this.existingPhotoUrls(), ...newPhotoUrls];
            const videoUrl = await this.uploadVideo(this.videoFile());
            const existingSnaps = this.sceneSnapPreviews()
                .map((preview, i) => (!preview.startsWith('data:') ? { url: preview, tag: this.sceneSnapTags()[i] || 'Spot' } : null))
                .filter(Boolean) as { url: string; tag: string }[];
            const newSnapUrls = await this.uploadFiles(this.sceneSnapFiles());
            const newSnaps = newSnapUrls.map((url, i) => ({ url, tag: this.sceneSnapTags()[existingSnaps.length + i] || 'Spot' }));
            const sceneSnaps = [...existingSnaps, ...newSnaps];
            this.uploadingPhotos.set(false);

            const updates: Partial<Cafe> = {
                name: this.editName(),
                address: this.editAddress(),
                openingHours: this.editOpeningHours(),
                operatingHours: this.editOperatingHours() as OperatingHours,
                tags: this.editTags(),
                isLateNight: this.editIsLateNight(),
                wifiSpeed: (this.editWifiSpeed() || undefined) as WifiSpeed | undefined,
                outletAvailability: (this.editOutletAvailability() || undefined) as OutletAvailability | undefined,
                photos: finalPhotoUrls,
                videoUrl,
                sceneSnaps,
            };
            await this.cafeService.updateCafeAsOwner(cafe.id, updates);
            this.existingPhotoUrls.set(finalPhotoUrls);
            this.photoPreviews.set(finalPhotoUrls);
            this.photoFiles.set([]);
            this.existingVideoUrl.set(videoUrl || '');
            this.videoPreview.set(videoUrl || '');
            this.videoFile.set(null);
            this.sceneSnapPreviews.set(sceneSnaps.map(s => s.url));
            this.sceneSnapTags.set(sceneSnaps.map(s => s.tag));
            this.sceneSnapFiles.set([]);
            this.cafe.update(c => c ? { ...c, ...updates } : c);
            this.toastService.show('Cafe info updated!', 'success');
        } catch {
            this.toastService.show('Save failed. Try again.', 'error');
        } finally {
            this.uploadingPhotos.set(false);
            this.saving.set(false);
        }
    }

    onPhotoSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const remaining = Math.max(0, 4 - this.photoPreviews().length);
        const newFiles = Array.from(input.files).slice(0, remaining);
        newFiles.forEach(file => {
            try {
                assertValidImageUpload(file);
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Invalid image upload.';
                this.toastService.show(msg, 'error');
                return;
            }
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
        if (!preview.startsWith('data:')) {
            this.existingPhotoUrls.update(urls => urls.filter(url => url !== preview));
        } else {
            const newFileIndex = this.photoPreviews().slice(0, index).filter(p => p.startsWith('data:')).length;
            this.photoFiles.update(files => files.filter((_, i) => i !== newFileIndex));
        }
        this.photoPreviews.update(previews => previews.filter((_, i) => i !== index));
    }

    onVideoSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            assertValidVideoUpload(file);
            this.videoFile.set(file);
            this.videoPreview.set(URL.createObjectURL(file));
            this.existingVideoUrl.set('');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Invalid video upload.';
            this.toastService.show(msg, 'error');
            this.videoFile.set(null);
            input.value = '';
        }
    }

    removeVideo() {
        const preview = this.videoPreview();
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        this.videoFile.set(null);
        this.videoPreview.set('');
        this.existingVideoUrl.set('');
    }

    onSceneSnapSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const remaining = Math.max(0, 5 - this.sceneSnapPreviews().length);
        const newFiles = Array.from(input.files).slice(0, remaining);
        newFiles.forEach(file => {
            try {
                assertValidImageUpload(file);
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Invalid image upload.';
                this.toastService.show(msg, 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                this.sceneSnapPreviews.update(p => [...p, e.target!.result as string]);
            };
            reader.readAsDataURL(file);
            this.sceneSnapFiles.update(f => [...f, file]);
            this.sceneSnapTags.update(tags => [...tags, '']);
        });
        input.value = '';
    }

    removeSceneSnap(index: number) {
        const preview = this.sceneSnapPreviews()[index];
        if (preview.startsWith('data:')) {
            const newFileIndex = this.sceneSnapPreviews().slice(0, index).filter(p => p.startsWith('data:')).length;
            this.sceneSnapFiles.update(files => files.filter((_, i) => i !== newFileIndex));
        }
        this.sceneSnapPreviews.update(previews => previews.filter((_, i) => i !== index));
        this.sceneSnapTags.update(tags => tags.filter((_, i) => i !== index));
    }

    updateSceneSnapTag(index: number, tag: string) {
        this.sceneSnapTags.update(tags => {
            const next = [...tags];
            next[index] = tag;
            return next;
        });
    }

    private async uploadFiles(files: File[]): Promise<string[]> {
        const user = this.authService.currentUser();
        if (!user || files.length === 0) return [];
        const urls: string[] = [];
        for (const file of files) {
            assertValidImageUpload(file);
            const path = createUserImagePath(user.uid, 'cafes', file);
            const { data, error } = await this.supabase.client.storage
                .from('cafe-photos')
                .upload(path, file, { contentType: file.type, upsert: false });
            if (error) throw error;
            const { data: urlData } = this.supabase.client.storage
                .from('cafe-photos')
                .getPublicUrl(data.path);
            urls.push(urlData.publicUrl);
        }
        return urls;
    }

    private async uploadVideo(file: File | null): Promise<string | null> {
        const user = this.authService.currentUser();
        if (!user || !file) return this.existingVideoUrl() || null;
        assertValidVideoUpload(file);
        const path = createUserMediaPath(user.uid, 'cafe-videos', file);
        const { data, error } = await this.supabase.client.storage
            .from('cafe-photos')
            .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data: urlData } = this.supabase.client.storage
            .from('cafe-photos')
            .getPublicUrl(data.path);
        return urlData.publicUrl;
    }

    async createDeal() {
        const cafe = this.cafe();
        if (!cafe || !this.newDealTitle() || !this.newDealValidFrom() || !this.newDealValidUntil()) {
            this.toastService.show('Fill in all required fields.', 'error');
            return;
        }
        this.saving.set(true);
        try {
            await this.dealService.createDeal(cafe.id, cafe.name, {
                title: this.newDealTitle(),
                description: this.newDealDescription(),
                validFrom: new Date(this.newDealValidFrom()).toISOString(),
                validUntil: new Date(this.newDealValidUntil()).toISOString(),
            });
            const updated = await this.dealService.getDealsForCafe(cafe.id);
            this.deals.set(updated);
            this.cafe.update(c => c ? { ...c, hasActiveDeal: true } : c);
            this.resetDealForm();
            this.toastService.show('Deal posted!', 'success');
        } catch {
            this.toastService.show('Failed to create deal.', 'error');
        } finally {
            this.saving.set(false);
        }
    }

    async toggleDeal(deal: Deal) {
        try {
            await this.dealService.toggleDeal(deal.id, !deal.isActive);
            this.deals.update(deals =>
                deals.map(d => d.id === deal.id ? { ...d, isActive: !d.isActive } : d)
            );
        } catch {
            this.toastService.show('Failed to update deal.', 'error');
        }
    }

    async deleteDeal(deal: Deal) {
        const cafe = this.cafe();
        if (!cafe) return;
        try {
            await this.dealService.deleteDeal(deal.id, cafe.id);
            this.deals.update(deals => deals.filter(d => d.id !== deal.id));
            const hasActive = this.deals().some(d => d.isActive);
            this.cafe.update(c => c ? { ...c, hasActiveDeal: hasActive } : c);
            this.toastService.show('Deal removed.', 'success');
        } catch {
            this.toastService.show('Failed to delete deal.', 'error');
        }
    }

    private resetDealForm() {
        this.newDealTitle.set('');
        this.newDealDescription.set('');
        this.newDealValidFrom.set('');
        this.newDealValidUntil.set('');
        this.showDealForm.set(false);
    }

    isDealActive(deal: Deal): boolean {
        const now = Date.now();
        return deal.isActive &&
            new Date(deal.validFrom).getTime() <= now &&
            new Date(deal.validUntil).getTime() >= now;
    }

    private defaultOperatingHours(): Partial<OperatingHours> {
        const defaults: Partial<OperatingHours> = {};
        for (const day of this.weekDays) {
            defaults[day.key] = { open: '09:00', close: '22:00', closed: false };
        }
        return defaults;
    }

    toggleDayHours(key: DayKey) {
        this.editOperatingHours.update(hours => ({
            ...hours,
            [key]: { ...(hours[key] ?? { open: '09:00', close: '22:00' }), closed: !hours[key]?.closed },
        }));
    }

    setDayTime(key: DayKey, field: 'open' | 'close', value: string) {
        this.editOperatingHours.update(hours => ({
            ...hours,
            [key]: { ...(hours[key] ?? { open: '09:00', close: '22:00', closed: false }), [field]: value },
        }));
    }

    getDayHours(key: DayKey): DayHours {
        return this.editOperatingHours()[key] ?? { open: '09:00', close: '22:00', closed: false };
    }

    goBack() { this.location.back(); }
}
