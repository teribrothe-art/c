-- 디자이너 계정 ID 확인
select id, email, role
from public.profiles
where role = 'designer';
