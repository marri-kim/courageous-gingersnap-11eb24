import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const SUPABASE_URL = 'https://xknxkvyockyirgffendt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0ZKk3lAI3Ymlp78lIgqUJA_a_Y3wXMD';
const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});
const form = document.getElementById('account-login-form');
const loginButton = document.getElementById('account-login-button');
const signedIn = document.getElementById('account-signed-in');
const details = document.getElementById('account-user-details');
const adminArea = document.getElementById('account-admin');
const adminList = document.getElementById('account-admin-list');
const status = document.getElementById('account-status');
const logout = document.getElementById('account-logout');
const refresh = document.getElementById('account-admin-refresh');
const signupForm = document.getElementById('account-signup-form');
const signupButton = document.getElementById('account-signup-button');
const signupStatus = document.getElementById('account-signup-status');
const signupBlock = document.getElementById('account-signup-block');
const passwordBlock = document.getElementById('account-set-password');
const passwordForm = document.getElementById('account-set-password-form');
const passwordButton = document.getElementById('account-set-password-button');
const passwordStatus = document.getElementById('account-password-status');
const invitationLink = new URLSearchParams(window.location.search).get('invite') === '1' ||
  new URLSearchParams(window.location.hash.slice(1)).get('type') === 'invite';
let needsInvitePassword = invitationLink;
let sessionVersion = 0;

function message(value) { status.textContent = value; }
function showGuest() {
  sessionVersion++;
  form.hidden = false;
  signupBlock.hidden = false;
  passwordBlock.hidden = true;
  signedIn.hidden = true;
  adminArea.hidden = true;
  adminList.replaceChildren();
  details.textContent = '';
}

async function loadAdminQuizzes() {
  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) { showGuest(); return; }
  const { data: roleRow } = await client.from('user_roles')
    .select('role').eq('user_id', auth.user.id).maybeSingle();
  if (roleRow?.role !== 'admin') { adminArea.hidden = true; return; }

  const { data: questions, error } = await client.from('quiz_questions')
    .select('id,question,is_published,sort_order').order('sort_order');
  adminList.replaceChildren();
  if (error) { message('문제를 조회할 수 없습니다. 잠시 후 다시 시도하세요.'); return; }
  const table = document.createElement('table');
  table.className = 'account-table';
  const header = document.createElement('tr');
  for (const name of ['퀴즈 문제', '공개 여부']) {
    const th = document.createElement('th');
    th.textContent = name;
    header.append(th);
  }
  table.append(header);
  for (const item of questions ?? []) {
    const row = document.createElement('tr');
    const text = document.createElement('td');
    text.textContent = item.question;
    const toggleCell = document.createElement('td');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = item.is_published;
    toggle.setAttribute('aria-label', item.question + ' 공개 여부');
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      const { data, error: updateError } = await client.from('quiz_questions')
        .update({ is_published: toggle.checked })
        .eq('id', item.id)
        .select('id');
      if (updateError || !data?.length) {
        toggle.checked = !toggle.checked;
        message('변경하지 못했습니다. 관리자 권한을 확인하세요.');
      } else {
        message('문제 공개 여부를 저장했습니다. 새로고침하면 퀴즈에 반영됩니다.');
      }
      toggle.disabled = false;
    });
    toggleCell.append(toggle);
    row.append(text, toggleCell);
    table.append(row);
  }
  adminList.append(table);
}

async function showAccount() {
  const version = ++sessionVersion;
  const { data: auth, error } = await client.auth.getUser();
  if (version !== sessionVersion) return;
  if (error || !auth?.user) { showGuest(); return; }
  const { data: roleRow, error: roleError } = await client.from('user_roles')
    .select('role').eq('user_id', auth.user.id).maybeSingle();
  if (version !== sessionVersion) return;
  form.hidden = true;
  signupBlock.hidden = true;
  signedIn.hidden = false;
  passwordBlock.hidden = !needsInvitePassword;
  const role = roleRow?.role === 'admin' ? '관리자' : '일반 사용자';
  details.textContent = (auth.user.email ?? '계정') + ' · ' + role;
  adminArea.hidden = role !== '관리자';
  if (roleError || !roleRow) message('계정 역할을 확인하지 못했습니다. 관리자에게 문의하세요.');
  else message('로그인되었습니다.');
  if (needsInvitePassword) {
    message('초대 링크 인증 완료. 비밀번호를 설정해 가입을 마무리하세요.');
    document.getElementById('account').scrollIntoView({ behavior: 'smooth' });
  }
  if (role === '관리자' && roleRow) await loadAdminQuizzes();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  loginButton.disabled = true;
  message('로그인 확인 중입니다...');
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const { error } = await client.auth.signInWithPassword({ email, password });
  form.elements.password.value = '';
  loginButton.disabled = false;
  if (error) { message('로그인하지 못했습니다. 이메일과 비밀번호를 확인하세요.'); return; }
  await showAccount();
});
logout.addEventListener('click', async () => {
  logout.disabled = true;
  const { error } = await client.auth.signOut();
  logout.disabled = false;
  if (error) { message('로그아웃에 실패했습니다. 다시 시도하세요.'); return; }
  showGuest();
  message('로그아웃되었습니다.');
});
refresh.addEventListener('click', loadAdminQuizzes);

signupForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (signupButton.disabled) return;
  signupButton.disabled = true;
  signupStatus.textContent = '가입 안내 메일을 요청하는 중입니다...';
  const email = signupForm.elements.email.value.trim();
  const approvalCode = signupForm.elements.approvalCode.value.trim();
  try {
    const response = await fetch('/api/request-signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, approvalCode }),
      signal: AbortSignal.timeout(17000)
    });
    const payload = await response.json().catch(() => ({}));
    signupStatus.textContent = response.ok
      ? (payload.message || '안내 메일을 확인하세요.')
      : (payload.error || '회원가입 요청에 실패했습니다.');
  } catch {
    signupStatus.textContent = '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    signupForm.elements.approvalCode.value = '';
    signupButton.disabled = false;
  }
});
passwordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const first = passwordForm.elements.newPassword.value;
  const second = passwordForm.elements.confirmPassword.value;
  if (first.length < 12 || first !== second) {
    passwordStatus.textContent = '비밀번호를 12자 이상으로 입력하고 확인값을 일치시켜 주세요.';
    return;
  }
  passwordButton.disabled = true;
  passwordStatus.textContent = '비밀번호를 저장하고 있습니다...';
  const { error } = await client.auth.updateUser({ password: first });
  passwordForm.reset();
  passwordButton.disabled = false;
  if (error) {
    passwordStatus.textContent = '비밀번호 설정에 실패했습니다. 초대 링크를 다시 확인해 주세요.';
    return;
  }
  needsInvitePassword = false;
  passwordBlock.hidden = true;
  window.history.replaceState(null, '', window.location.pathname + '#account');
  message('회원가입이 완료됐습니다. 로그인 상태로 이용할 수 있습니다.');
});
client.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    window.setTimeout(() => { void showAccount(); }, 0);
  }
});

void showAccount();
