-- Private, owner-scoped objects. Logical PDFs are saved as resumable 4 MiB parts.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('appnote-pdfs','appnote-pdfs',false,6291456,array['application/octet-stream','application/json'])
on conflict(id) do nothing;
create policy appnote_pdf_read on storage.objects for select to authenticated
using(bucket_id='appnote-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy appnote_pdf_insert on storage.objects for insert to authenticated
with check(bucket_id='appnote-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy appnote_pdf_update on storage.objects for update to authenticated
using(bucket_id='appnote-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='appnote-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy appnote_pdf_delete on storage.objects for delete to authenticated
using(bucket_id='appnote-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text);
