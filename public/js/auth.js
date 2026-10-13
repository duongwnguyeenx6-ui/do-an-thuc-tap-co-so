export function createComponent(context) {
  const { state, escapeHtml } = context;

  function renderAuthModal() {
    if (!state.authMode) return '';
    const register = state.authMode === 'register';
    const forgot = state.authMode === 'forgot';
    const reset = state.authMode === 'reset';
    const title = register ? 'Đăng ký' : forgot ? 'Quên mật khẩu' : reset ? 'Đặt lại mật khẩu' : 'Đăng nhập';
    const passwordField = !forgot;
    const lampOn = Boolean(state.authLampOn);
    return `<div class="auth-modal ${lampOn ? 'is-lamp-on' : ''}" role="dialog" aria-modal="true" aria-label="Tài khoản"><div class="lamp-bubbles" aria-hidden="true">${'<span></span>'.repeat(40)}</div><section class="auth-card auth-lamp-scene auth-card--${state.authMode} ${lampOn ? 'is-lamp-on' : ''}">
      <button class="auth-close" type="button" data-action="close-auth" aria-label="Đóng">×</button>
      <div class="lamp-wrapper">
        <svg class="lamp-svg" viewBox="0 0 200 300" role="img" aria-label="Đèn bàn">
          <ellipse class="inner-glow" cx="100" cy="112" rx="62" ry="34"></ellipse>
          <rect class="lamp-base" x="92" y="106" width="16" height="148" rx="8"></rect>
          <rect class="lamp-base" x="60" y="248" width="80" height="14" rx="7"></rect>
          <line class="cord-line" x1="130" y1="112" x2="130" y2="190"></line>
          <path class="lamp-shade" d="M30 110 C30 50 170 50 170 110 C170 125 30 125 30 110Z"></path>
        </svg>
        <button class="lamp-cord-toggle" type="button" data-action="toggle-lamp" aria-label="${lampOn ? 'Tắt đèn và ẩn biểu mẫu' : 'Bật đèn và mở biểu mẫu'}" aria-pressed="${lampOn}"></button>
      </div>
      <div class="auth-card-content">
        ${register || forgot || reset ? '<button class="auth-back" type="button" data-action="open-auth" data-mode="login" aria-label="Quay lại đăng nhập" title="Quay lại đăng nhập">←</button>' : ''}
        <h2>${title}</h2><p class="auth-intro">Sọt Truyện</p>
      <form id="authForm" class="auth-form">${register ? '<div class="auth-row"><label>Họ và tên<input name="fullName" required></label><label>Tên người dùng<input name="username" required></label></div><div class="auth-row"><label>Ngày sinh<input name="dateOfBirth" type="date"></label><label>Vai trò<div class="auth-role-picker"><input name="role" type="hidden" value="reader"><button class="auth-role-trigger" type="button" data-action="toggle-role-menu" aria-haspopup="listbox" aria-expanded="false"><span>Độc giả</span><span class="auth-role-chevron" aria-hidden="true"></span></button><div class="auth-role-menu" role="listbox" aria-label="Chọn vai trò" hidden><button type="button" role="option" data-action="select-auth-role" data-role-value="reader" aria-selected="true">Độc giả</button><button type="button" role="option" data-action="select-auth-role" data-role-value="author" aria-selected="false">Tác giả</button></div></div></label></div>' : ''}
        ${!reset ? '<label>Email hoặc tên người dùng<input name="email" type="text" required autocomplete="username"></label>' : `<label>Mã đặt lại<input name="token" value="${escapeHtml(state.resetToken)}" required></label>`}
        ${passwordField ? `<label>${reset ? 'Mật khẩu mới' : 'Mật khẩu'}<input name="${reset ? 'newPassword' : 'password'}" type="password" required minlength="6" autocomplete="${reset ? 'new-password' : 'current-password'}"></label>` : ''}
        <p id="authMessage" class="auth-message ${state.authNotice ? 'success' : ''}" role="status">${escapeHtml(state.authNotice)}</p><button class="button button-primary auth-submit" type="submit">${register ? 'Đăng ký' : forgot ? 'Tạo mã đặt lại' : reset ? 'Đổi mật khẩu' : 'Đăng nhập'}</button>
      </form><div class="auth-links">${!register && !forgot && !reset ? '<button type="button" data-action="open-auth" data-mode="forgot">Quên mật khẩu?</button><button type="button" data-action="open-auth" data-mode="register">Tạo tài khoản</button>' : ''}</div></div></section></div>`;
  }


  return { renderAuthModal };
}
