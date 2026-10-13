# QR payments (VietQR + SePay)

The app creates a pending `payment_orders` row when a signed-in reader starts checkout. It only adds a `purchases` row and unlocks the story after a valid SePay webhook or an admin confirms that money was received.

## Configure the receiving account

Copy the payment settings from `.env.example` into your local `.env` and fill in:

- `PAYMENT_BANK_CODE`: the bank code/alias accepted by VietQR (for example, `MB`, `VCB`, or `970422`).
- `PAYMENT_ACCOUNT_NUMBER`: the receiving account number.
- `PAYMENT_ACCOUNT_NAME`: the account holder name.
- `SEPAY_WEBHOOK_API_KEY`: a long random secret used to authenticate SePay callbacks.

Never commit `.env` or share the webhook key. Restart Flask after changing environment settings. Running the project with `python app.py` calls `initialize_app()` and creates the payment table. If deploying through a WSGI server such as Gunicorn, run `initialize_app()` once as part of deployment/startup before serving requests.

The sample values in `.env.example` are explicitly marked as demo-only and use a fake account. With `PAYMENT_DEMO_MODE=true`, the checkout displays a warning and must not be used to make a real transfer. Set it to `false` and replace all receiver details before accepting payments.

For local UI testing, while `PAYMENT_DEMO_MODE=true`, the checkout hides all QR/account details and shows a **Giả lập thanh toán thành công** button instead. The simulation endpoint is restricted to loopback clients and records the purchase as `demo_simulation`. Set `PAYMENT_DEMO_MODE=false` to restore the live QR and disable this button; live orders require a valid webhook or admin verification.

## Configure automatic confirmation

Deploy the Flask app at a publicly reachable HTTPS address. In the SePay dashboard, create a webhook for incoming transfers, configure **API Key** authentication with the same `SEPAY_WEBHOOK_API_KEY`, and set the callback URL to:

```text
https://YOUR_PUBLIC_HOST/api/payments/sepay/webhook
```

The QR includes a unique `ST...` transfer description. The webhook accepts only incoming transactions for the configured receiving account, with the matching description and exact order amount. SePay transaction IDs are unique in the database, so webhook retries cannot grant access twice.

## Demo/manual confirmation

If no webhook is configured, an admin can open the Admin page, verify the incoming transfer in the bank account, and then confirm the matching pending order. Never confirm an order based only on a screenshot or the reader's claim. Manual confirmation grants the same access as a successful webhook.

`payment_orders` stores the reader, story, amount, payment code, status, confirmation method, and SePay transaction metadata. `purchases` continues to contain completed purchases only.
