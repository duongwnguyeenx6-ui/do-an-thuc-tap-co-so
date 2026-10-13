export function createPaymentViews(context) {
    const { state, escapeHtml, money } = context;

    function renderPaymentModal() {
        const order = state.paymentOrder;
        if (!order) return '';

        const paid = order.status === 'paid';
        const simulated = order.confirmationMethod === 'demo_simulation';
        return `<div class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
      <section class="payment-card">
        <button class="auth-close" type="button" data-action="close-payment" aria-label="Đóng">×</button>
        <span class="eyebrow">${order.demo ? 'DEMO · KHÔNG CÓ GIAO DỊCH THẬT' : 'Thanh toán QR · SePay'}</span>
        <h2 id="paymentTitle">${paid ? 'Giao dịch thành công' : order.demo ? 'Mô phỏng thanh toán' : 'Quét QR để thanh toán'}</h2>
        <p>${paid ? 'Truyện đã được mở khóa cho tài khoản của bạn.' : order.demo ? 'Bấm nút bên dưới để giả lập đã thanh toán. Không quét QR và không chuyển tiền.' : 'Mở ứng dụng ngân hàng, quét mã và chuyển đúng số tiền bên dưới.'}</p>
        ${paid ? `<div class="payment-success" role="status">Đã thanh toán${simulated ? ' (mô phỏng)' : ''}</div>` : order.demo ? '<div class="payment-demo-placeholder" role="img" aria-label="QR đã tắt trong chế độ mô phỏng">QR đã tắt trong chế độ demo</div>' : `<img class="payment-qr" src="${escapeHtml(order.qrUrl)}" alt="Mã QR thanh toán ${escapeHtml(order.paymentCode)}">`}
        <dl class="payment-details">
          ${order.demo ? '' : `<div><dt>Ngân hàng</dt><dd>${escapeHtml(order.bankCode)}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>${escapeHtml(order.accountName)}</dd></div>
          <div><dt>Số tài khoản</dt><dd>${escapeHtml(order.accountNumber)}</dd></div>`}
          <div><dt>Số tiền</dt><dd>${money(order.amount)}đ</dd></div>
          ${order.demo ? '' : `<div><dt>Nội dung chuyển khoản</dt><dd>${escapeHtml(order.paymentCode)}</dd></div>`}
          <div><dt>Trạng thái</dt><dd>${paid ? 'Đã thanh toán' : order.demo ? 'Chờ mô phỏng' : 'Đang chờ thanh toán'}</dd></div>
        </dl>
        <p class="payment-note">${order.demo ? 'Chế độ mô phỏng chỉ chạy trên máy local; đơn này sẽ được ghi nhận là giao dịch demo.' : 'Hãy giữ nguyên nội dung chuyển khoản để hệ thống tự nhận diện giao dịch. Admin cần đối chiếu tiền vào và xác nhận thủ công.'}</p>
        <div class="payment-actions">
          ${paid ? '' : order.demo
            ? '<button class="button button-primary" type="button" data-action="demo-confirm-payment" data-id="' + order.id + '">Giả lập thanh toán thành công</button>'
            : '<button class="button button-primary" type="button" data-action="refresh-payment" data-id="' + order.id + '">Kiểm tra trạng thái</button>'}
          <button class="button button-secondary" type="button" data-action="close-payment">${paid ? 'Đọc truyện' : 'Đóng'}</button>
        </div>
      </section>
    </div>`;
  }

  return { renderPaymentModal };
}