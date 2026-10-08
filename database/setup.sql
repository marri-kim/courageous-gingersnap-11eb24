-- AI 첫걸음: 퀴즈 데이터베이스 초기 설정
-- Supabase 대시보드 > SQL Editor에서 실행합니다.
-- 공개 웹사이트용 읽기 전용 데이터입니다. 학생 개인정보는 저장하지 않습니다.

create table if not exists public.quiz_questions (
  id text primary key,
  sort_order integer not null unique,
  question text not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  correct_index integer not null check (correct_index >= 0),
  explanation text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- 공개 스키마의 테이블은 RLS(행 단위 보안)를 활성화합니다.
alter table public.quiz_questions enable row level security;

-- 공개 사용자는 문제를 조회만 할 수 있으며, 등록/수정/삭제는 할 수 없습니다.
revoke all on table public.quiz_questions from anon, authenticated;
grant select on table public.quiz_questions to anon, authenticated;

-- 중복 실행 시 정책 오류가 발생하지 않게 처리합니다.
drop policy if exists "Public read published quizzes" on public.quiz_questions;
create policy "Public read published quizzes"
  on public.quiz_questions
  for select
  to anon, authenticated
  using (is_published = true);

-- 기존 웹사이트에 있는 퀴즈 3문제를 등록합니다.
-- 이미 같은 id가 있다면 덮어쓰지 않습니다.
insert into public.quiz_questions
  (id, sort_order, question, answers, correct_index, explanation, is_published)
values
  (
    'ai-basics-01', 1,
    'AI(인공지능)를 가장 잘 설명한 것은?',
    '["어떤 질문에도 절대 틀리지 않는 컴퓨터","데이터에서 패턴을 배우고 문제 해결을 돕는 기술","스스로 마법을 부리는 기계"]'::jsonb,
    1,
    'AI는 데이터를 활용해 패턴을 찾고 여러 작업을 돕지만, 틀린 결과를 낼 수도 있어요.',
    true
  ),
  (
    'ai-basics-02', 2,
    'AI가 알려준 정보를 받으면 어떻게 할까요?',
    '["중요한 내용은 다른 믿을 만한 자료로 확인해요","AI가 말했다면 무조건 믿어요","확인하지 않고 모두에게 전달해요"]'::jsonb,
    0,
    'AI는 자신 있게 틀린 답을 말하기도 해요. 중요한 정보는 다른 자료로 확인하세요.',
    true
  ),
  (
    'ai-basics-03', 3,
    'AI 서비스를 사용할 때 입력하면 안 되는 것은?',
    '["좋아하는 음식","오늘 배우고 싶은 주제","집 주소나 비밀번호 같은 개인정보"]'::jsonb,
    2,
    '집 주소, 비밀번호, 전화번호 같은 개인정보는 AI 서비스에 입력하지 않는 것이 안전해요.',
    true
  )
on conflict (id) do nothing;

-- 생성된 데이터를 확인합니다.
select id, sort_order, question, is_published
from public.quiz_questions
order by sort_order;
