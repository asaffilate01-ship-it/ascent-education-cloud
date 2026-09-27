-- Illustrative catalogue seeds. Keep draft until accreditation/partner/delivery approval is confirmed.
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'English Proficiency / IELTS-PTE Preparation','english-ielts-pte','language','unipathway',3,'months',array['online','centre'],false,'English proficiency and test-preparation pathway.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Food Safety for Food Handlers','food-safety-handlers','employer_short_course','unipathway',1,'days',array['online','centre','employer_site'],false,'Employer-focused food hygiene and safe handling training.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Full Stack Development','full-stack-development','digital','NAVTTC',6,'months',array['online','centre'],true,'Digital skills programme; external route subject to centre/partner approval.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Fashion Designing & Dress Making','fashion-dress-making','vocational','NAVTTC',3,'months',array['centre'],true,'Practical fashion, sewing and dress-making programme.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Chef / Cook','chef-cook','hospitality','NAVTTC',6,'months',array['centre','partner_site'],true,'Practical culinary skills programme.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,employer_placement_supported,description,approval_status)
select id,'Carpentry','carpentry','trade','NAVTTC',6,'months',array['centre','partner_site'],true,true,'Practical carpentry with approved workshop/employer delivery.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,employer_placement_supported,description,approval_status)
select id,'Masonry / Bricklaying','masonry-bricklaying','trade','NAVTTC',6,'months',array['partner_site'],true,true,'Construction trade skills with supervised practical delivery.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,employer_placement_supported,description,approval_status)
select id,'Automotive Technician','automotive-technician','trade','NAVTTC',6,'months',array['partner_site'],true,true,'Hands-on automotive technician pathway with approved practical partner.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Agribusiness','agribusiness','agriculture','NAVTTC',3,'months',array['online','centre','partner_site'],true,'Agribusiness foundations with optional practical partner activity.','draft' from public.tenants limit 1;
insert into public.course_catalogue(tenant_id,title,slug,course_family,awarding_route,duration_value,duration_unit,delivery_modes,practical_required,description,approval_status)
select id,'Fish Farming','fish-farming','agriculture','NAVTTC',3,'months',array['online','partner_site'],true,'Aquaculture/fish-farming skills with practical component.','draft' from public.tenants limit 1;
