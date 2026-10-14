export function createLayoutViews(context) {
  const { state, escapeHtml, hasAuthorAccess, formatDate, money } = context;

        function themeToggleButton() {
            const darkMode = Boolean(state.darkMode);
            return `<label class="theme-switch" data-action="toggle-theme" title="${darkMode ? 'Chế độ tối' : 'Chế độ sáng'}"><input type="checkbox" class="theme-switch__checkbox" aria-label="${darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}" aria-pressed="${darkMode}" ${darkMode ? 'checked' : ''}><div class="theme-switch__container"><div class="theme-switch__clouds"></div><div class="theme-switch__stars-container"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor"></path></svg></div><div class="theme-switch__circle-container"><div class="theme-switch__sun-moon-container"><div class="theme-switch__moon"><div class="theme-switch__spot"></div><div class="theme-switch__spot"></div><div class="theme-switch__spot"></div></div></div></div></div></label>`;
        }

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
            ${themeToggleButton()}
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

  return { mainHeader, renderAccountPanel, themeToggleButton };
}
