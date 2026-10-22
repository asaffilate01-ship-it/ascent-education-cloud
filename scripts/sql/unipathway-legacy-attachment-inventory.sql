-- Read-only counts. Repeat immediately before the private-attachment cutover.
-- No message bodies, filenames, links or personal identifiers are returned.
SELECT jsonb_build_object(
 'public_resource_objects',(SELECT count(*) FROM storage.objects WHERE bucket_id='resources'),
 'messages_with_any_public_storage_url',(SELECT count(*) FROM public.messages WHERE content LIKE '%/storage/v1/object/public/%'),
 'messages_with_legacy_attachment_marker',(SELECT count(*) FROM public.messages WHERE content LIKE '📎 [%'),
 'resources_bucket_public',(SELECT public FROM storage.buckets WHERE id='resources')
) AS legacy_attachment_inventory;
