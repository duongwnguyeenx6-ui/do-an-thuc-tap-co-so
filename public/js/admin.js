export function createComponent(context) {
  const { state, escapeHtml, money, canEditStory, mainHeader, renderAuthModal, renderAdminSummary } = context;

  function renderPendingPayments() {
    const orders = state.pendingPayments || [];
    return `<section class="admin-panel payment-admin-panel"><h3>Đơn QR chờ xác nhận</h3>
      ${orders.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Mã đơn</th><th>Người dùng</th><th>Truyện</th><th>Số tiền</th><th>Thao tác</th></tr></thead><tbody>
        ${orders.map((order) => `<tr><td>${escapeHtml(order.paymentCode)}</td><td>${escapeHtml(order.username)}<small>${escapeHtml(order.email)}</small></td><td>${escapeHtml(order.storyTitle)}</td><td>${money(order.amount)}đ</td><td><button class="button button-primary" data-action="confirm-payment" data-id="${order.id}">Xác nhận đã kiểm tra tiền vào</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty-chapters">Không có đơn thanh toán nào đang chờ.</p>'}
    </section>`;
  }

  function renderAdmin() {
    return `${mainHeader()}<main class="page-shell container"><section class="admin-panel"><div class="section-heading"><div><span class="eyebrow">Quản lý</span><h2>Quản trị hệ thống</h2></div><button class="button button-primary" data-action="open-writer">Viết truyện mới</button></div></section>
      <div id="adminStatsContainer">${renderAdminSummary()}</div>
      <div id="pendingPaymentsContainer">${renderPendingPayments()}</div>
      <section class="admin-panel"><h3>Kho truyện</h3><div class="chapter-items">${state.stories.length ? state.stories.map((story) => `<div class="chapter-row"><div class="chapter-item"><strong>${escapeHtml(story.tieuDe)}</strong><small>${escapeHtml(story.tacGia)} · ${escapeHtml(story.theLoai)} · ${Number(story.gia || 0) ? `${money(story.gia)}đ` : 'Miễn phí'}</small></div><div class="chapter-actions"><button class="button button-secondary" data-action="story-detail" data-id="${story.maTruyen}">Xem</button>${canEditStory(story) ? `<button class="button button-secondary" data-action="open-writer" data-id="${story.maTruyen}">Sửa</button>` : ''}<button class="button button-danger" data-action="delete-story" data-id="${story.maTruyen}">Xóa</button></div></div>`).join('') : '<p class="empty-chapters">Kho truyện hiện đang trống.</p>'}</div></section></main>${renderAuthModal()}`;
  }


  return { renderAdmin, renderPendingPayments };
}
