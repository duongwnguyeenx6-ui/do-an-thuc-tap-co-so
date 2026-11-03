# Hướng dẫn chạy dự án và SePay Test mode

## Chuẩn bị

Mở thư mục dự án trong VS Code, sau đó mở hai Terminal riêng (Terminal > New Terminal). Cả hai Terminal cần ở thư mục gốc dự án:

```powershell
cd "C:\Users\trump\OneDrive\Desktop\doanthuctapcoso"
```

## Terminal 1: chạy website

```powershell
npm start
```

Để nguyên Terminal này đang chạy. Website local mở tại:

```text
http://localhost:3000
```

## Terminal 2: tạo Cloudflare Quick Tunnel

```powershell
.\cloudflared.exe tunnel --url http://localhost:3000
```

Lần đầu Windows Firewall có thể hỏi quyền kết nối cho `cloudflared.exe`. Nếu chỉ test trên mạng nhà riêng, chỉ cần cho phép **Private networks**; không cần bật **Public networks**.

Trong output, tim dong:

```text
Your quick Tunnel has been created! Visit it at
```

URL `https://....trycloudflare.com` bên dưới là URL public của website. Quick Tunnel có thể tạo URL mới mỗi lần khởi động lại.

## Cấu hình webhook SePay Test mode

Trong SePay Test mode, vào **Webhooks** và sửa webhook `XÁC THỰC THANH TOÁN`. URL nhận webhook là URL Quick Tunnel vừa tạo, thêm đường dẫn:

```text
/api/payments/sepay/webhook
```

Vi du:

```text
https://ten-ngau-nhien.trycloudflare.com/api/payments/sepay/webhook
```

Nếu URL Quick Tunnel thay đổi, cập nhật URL webhook trong SePay. Giữ cả hai Terminal mở trong lúc test.

## Lưu ý

- Đây là **Test mode**: giao dịch mô phỏng, không chuyển tiền thật. Không dùng cấu hình Test mode để nhận tiền của khách.
- `cloudflared.exe` nằm ở thư mục gốc để tiện chạy lệnh, nhưng đã được thêm vào `.gitignore`; không commit file này lên Git.
- Không chia sẻ file `.env` vì file này chứa thông tin kết nối và khóa webhook.
