alter table public.cafes
add column if not exists "videoUrl" text;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'cafe-photos',
    'cafe-photos',
    true,
    26214400,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ]
)
on conflict (id) do update
set
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ];

drop policy if exists "Public can read cafe media" on storage.objects;
create policy "Public can read cafe media"
on storage.objects
for select
to public
using (bucket_id = 'cafe-photos');

drop policy if exists "Users can upload cafe media" on storage.objects;
create policy "Users can upload cafe media"
on storage.objects
for insert
to public
with check (
    bucket_id = 'cafe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov')
);
