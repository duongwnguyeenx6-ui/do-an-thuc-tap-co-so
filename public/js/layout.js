export function createLayoutViews(context) {
  const { state, escapeHtml, hasAuthorAccess, formatDate, money } = context;

        function mainHeader(active = 'home') {
            const accountButton = state.user ?
                `<div class="account-menu"><button class="button button-account user-button" data-action="toggle-account-panel" aria-expanded="${state.accountOpen}" aria-controls="accountPanel"><span class="user-avatar-mini">${escapeHtml((state.user.fullName || state.user.username || '?').charAt(0).toUpperCase())}</span><span class="user-button-label">${escapeHtml(state.user.fullName || state.user.username)}</span></button>${renderAccountPanel()}</div>` :
                '<button class="button button-primary" data-action="open-auth" data-mode="login">Đăng nhập</button>';
            const authorButton = hasAuthorAccess() ?
                `<button class="button button-secondary" data-action="${state.user.role === 'admin' ? 'open-admin' : 'open-writer'}">${state.user.role === 'admin' ? 'Quản trị' : 'Viết truyện'}</button>` :
                '';

            return `
      <header class="topbar" id="homeTop">
        <div class="container topbar-inner">
          <a class="brand" href="#homeTop" data-action="home"><span class="brand-mark">S</span><span>Sọt Truyện</span></a>
          <nav class="main-nav" aria-label="Điều hướng chính">
            <span class="nav-marker" aria-hidden="true"></span>
            <a class="${active === 'home' ? 'active' : ''}" href="#homeTop" data-action="home">Trang chủ</a>
            <a href="#genres" data-action="scroll-to" data-target="genres">Thể loại</a>
            <a href="#latest" data-action="scroll-to" data-target="latest">Truyện mới</a>
            <a href="#latest" data-action="filter-full">Truyện full</a>
            <a class="${active === 'ranking' ? 'active' : ''}" href="#ranking" data-action="open-rankings">BXH</a>
          </nav>
          <div class="top-actions">
            <div class="search-wrap">
              <span class="search-box"><span aria-hidden="true">⌕</span><input id="searchInput" type="search" aria-label="Tìm truyện" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="searchSuggestions" aria-expanded="false" placeholder="Tìm truyện, tác giả..." value="${escapeHtml(state.query)}"></span>
              <span id="searchSuggestions" class="search-suggestions" role="listbox" hidden></span>
            </div>
            ${authorButton}${accountButton}
          </div>
        </div>
      </header>`;
        }

        function renderAccountPanel() {
            if (!state.accountOpen || !state.user) return '';
            const user = state.account.user || state.user;
            const purchases = state.account.purchases || [];
            const age = user.dateOfBirth ? Math.max(0, new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()) : null;
            return `
      <section class="account-panel account-popover auth-card-content is-lamp-on is-entering" id="accountPanel" role="region" aria-label="Thông tin tài khoản">
        <div class="account-panel-header"><div><span class="eyebrow">Tài khoản</span><h2>${state.accountPanelView === 'info' ? 'Thông tin tài khoản' : state.accountPanelView === 'history' ? 'Lịch sử giao dịch' : 'Tài khoản'}</h2><p class="account-panel-intro">${state.accountPanelView === 'info' ? 'Thông tin hồ sơ của bạn' : state.accountPanelView === 'history' ? 'Các giao dịch mua truyện gần đây' : 'Quản lý tài khoản của bạn'}</p></div><button class="auth-close" type="button" data-action="toggle-account-panel" aria-label="Đóng">×</button></div>
        <div class="account-panel-content" id="accountPanelContent">
          ${state.accountPanelView === 'info' ? `
            <button class="account-back-button" type="button" data-action="account-panel-view" data-view="menu">← Quay lại</button>
            ${state.accountEditing ? `
              <form id="accountEditForm" class="account-edit-form">
                <label>Họ tên<input name="fullName" value="${escapeHtml(user.fullName || '')}" required maxlength="120"></label>
                <label>Tên đăng nhập<input name="username" value="${escapeHtml(user.username || '')}" required maxlength="80" autocomplete="username"></label>
                <label>Email<input name="email" type="email" value="${escapeHtml(user.email || '')}" required maxlength="254" autocomplete="email"></label>
                <label>Ngày sinh<input name="dateOfBirth" type="date" value="${escapeHtml((user.dateOfBirth || '').slice(0, 10))}"></label>
                <p id="accountEditMessage" class="account-edit-message" role="alert"></p>
                <div class="account-edit-actions">
                  <button class="button button-secondary" type="button" data-action="account-edit">Hủy</button>
                  <button class="button button-primary" type="submit">Lưu thay đổi</button>
                </div>
              </form>
            ` : `
              <div class="account-grid"><div class="account-avatar">${escapeHtml((user.fullName || user.username || '?').charAt(0).toUpperCase())}</div>
                <div class="account-details">
                  <div class="account-row"><span>Họ tên</span><strong>${escapeHtml(user.fullName || user.username)}</strong></div>
                  <div class="account-row"><span>Tên đăng nhập</span><strong>${escapeHtml(user.username)}</strong></div>
                  <div class="account-row"><span>Email</span><strong>${escapeHtml(user.email)}</strong></div>
                  <div class="account-row"><span>Tuổi</span><strong>${age === null ? 'Chưa cập nhật' : `${age} tuổi`}</strong></div>
                  <div class="account-row"><span>Ngày sinh</span><strong>${formatDate(user.dateOfBirth)}</strong></div>
                  <div class="account-row"><span>Ngày tạo tài khoản</span><strong>${formatDate(user.createdAt)}</strong></div>
                </div>
              </div>
              ${state.accountEditNotice ? `<p class="account-edit-success" role="status">${escapeHtml(state.accountEditNotice)}</p>` : ''}
              <button class="button account-edit-trigger" type="button" data-action="account-edit">Chỉnh sửa thông tin</button>
            `}
            ${state.accountLoadError ? `<p class="account-load-error" role="alert">Không tải được thông tin tài khoản: ${escapeHtml(state.accountLoadError)}</p>` : ''}
          ` : state.accountPanelView === 'history' ? `
            <button class="account-back-button" type="button" data-action="account-panel-view" data-view="menu">← Quay lại</button>
            <div class="account-history-table-wrap"><table class="account-history-table"><thead><tr><th>Truyện</th><th>Ngày mua</th><th>Số tiền</th></tr></thead><tbody>
              ${purchases.length ? purchases.map((purchase) => `<tr><td>${escapeHtml(purchase.storyTitle)}</td><td>${formatDate(purchase.createdAt)}</td><td>${money(purchase.amount)}đ</td></tr>`).join('') : '<tr><td colspan="3">Bạn chưa có giao dịch nào.</td></tr>'}
            </tbody></table></div>
          ` : `
            ${state.accountLoadError ? `<p class="account-load-error" role="alert">Không tải được thông tin tài khoản: ${escapeHtml(state.accountLoadError)}</p>` : ''}
            <div class="account-menu-options">
              <button class="account-menu-option" type="button" data-action="account-panel-view" data-view="info"><span class="account-menu-option-icon" aria-hidden="true">◎</span><span>Thông tin tài khoản</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
              <button class="account-menu-option" type="button" data-action="account-panel-view" data-view="history"><span class="account-menu-option-icon" aria-hidden="true">↻</span><span>Lịch sử giao dịch</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
              <button class="account-menu-option account-menu-logout" type="button" data-action="logout"><span class="account-menu-option-icon" aria-hidden="true">↪</span><span>Đăng xuất</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
            </div>
          `}
        </div>
      </section>`;
  }

  return { mainHeader, renderAccountPanel };
}
