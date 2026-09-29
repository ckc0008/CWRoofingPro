begin;
insert into auth.users (id, email) values
('00000000-0000-4000-8000-000000000001','cw-test-admin@example.invalid'),
('00000000-0000-4000-8000-000000000002','cw-test-staff@example.invalid'),
('00000000-0000-4000-8000-000000000003','cw-test-viewer@example.invalid'),
('00000000-0000-4000-8000-000000000004','cw-test-outsider@example.invalid');
insert into public.staff_members (user_id, role) values
('00000000-0000-4000-8000-000000000001','admin'),
('00000000-0000-4000-8000-000000000002','staff'),
('00000000-0000-4000-8000-000000000003','viewer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.leads (first_name,last_name) values ('CW RLS','Test');
do $$ begin
if (select count(*) from public.leads where first_name='CW RLS') <> 1 then raise exception 'staff read failed'; end if;
begin
insert into public.staff_members(user_id,role) values ('00000000-0000-4000-8000-000000000004','admin');
raise exception 'privilege escalation allowed';
exception when insufficient_privilege then null; end;
begin
insert into public.settings(key,value) values ('cw_rls_test','x');
raise exception 'staff settings write allowed';
exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
if (select count(*) from public.leads where first_name='CW RLS') <> 1 then raise exception 'viewer read failed'; end if;
begin
insert into public.leads(first_name,last_name) values ('viewer','forbidden');
raise exception 'viewer write allowed';
exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$ begin
if (select count(*) from public.leads) <> 0 then raise exception 'outsider read allowed'; end if;
begin
insert into public.leads(first_name,last_name) values ('outsider','forbidden');
raise exception 'outsider write allowed';
exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.settings(key,value) values ('cw_rls_test','verified');
select 'Staff, viewer, outsider, and admin authorization checks passed; test data rolled back.' as result;
rollback;
