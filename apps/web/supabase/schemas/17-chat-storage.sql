-- Chat Storage Buckets
-- Storage buckets for chat images and PDFs

-- Create buckets for chat files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('chat-images', 'chat-images', true, 10485760, array['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('chat-pdfs', 'chat-pdfs', true, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- RLS Policies for chat-images bucket
create policy "Allow authenticated users to upload chat images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-images');

create policy "Allow public read access to chat images"
on storage.objects for select
to public
using (bucket_id = 'chat-images');

create policy "Allow users to delete their own chat images"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat-images');

-- RLS Policies for chat-pdfs bucket
create policy "Allow authenticated users to upload chat PDFs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-pdfs');

create policy "Allow public read access to chat PDFs"
on storage.objects for select
to public
using (bucket_id = 'chat-pdfs');

create policy "Allow users to delete their own chat PDFs"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat-pdfs');

-- Note: Files will be organized by session:
-- chat-images/{sessionId}/{timestamp}-{filename}
-- chat-pdfs/{sessionId}/{timestamp}-{filename}


