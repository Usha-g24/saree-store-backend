# Saree Store - Backend (Node + Express + MongoDB)

Place this folder at `saree-store/saree-store-backend` (next to `saree-store-frontend`).

## Setup
```bash
cd saree-store/saree-store-backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set JWT_SECRET (long random string), MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed                # creates admin, 5 categories, 10 sample sarees (idempotent)
npm run dev                 # http://localhost:5000  (npm start for production)
```
Check: `GET http://localhost:5000/api/health`

**MongoDB:** either install MongoDB Community locally (default `mongodb://127.0.0.1:27017/saree-store`) or create a free Atlas cluster and paste its connection string into `MONGO_URI`.

**Admin:** public registration always creates customers. The only way to get an admin is `npm run seed` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set (an existing user with that email is promoted). Log in via `POST /api/auth/login`; the response has `token` and `user.role`.

Send the token as `Authorization: Bearer <token>`. Frontend: set `VITE_API_URL=http://localhost:5000/api` and use one Axios instance in `services/`. Product image URLs in API responses are absolute and load directly.

## API
Auth - `POST /api/auth/register | login | forgot-password | reset-password/:token`, `GET/PUT /api/auth/me`
Products - `GET /api/products` (`search, category=<slug|id>, fabric, color, minPrice, maxPrice, inStock, featured=true, sort=newest|price_asc|price_desc|name|bestselling, page, limit`), `GET /api/products/:id`, `GET /api/products/:id/related`
  Home sections: featured = `?featured=true`, new arrivals = `?sort=newest`, best sellers = `?sort=bestselling`
Categories - `GET /api/categories`
Cart (login) - `GET /api/cart`, `POST /api/cart {productId, quantity}`, `PUT /api/cart/:productId {quantity}` (0 removes), `DELETE /api/cart/:productId`, `DELETE /api/cart`
Wishlist (login) - `GET /api/wishlist`, `POST|DELETE /api/wishlist/:productId`
Orders (login) - `POST /api/orders {shippingAddress}` (built from the server cart), `GET /api/orders/mine`, `GET /api/orders/:id`, `PUT /api/orders/:id/cancel`
Admin only:
- `POST /api/products` and `PUT /api/products/:id` - multipart/form-data; files in field `images` (JPG/PNG/WEBP, max 8, 5 MB each); on PUT send `removeImages` (image keys) to delete images
- `PATCH /api/products/:id/stock {stock}`, `DELETE /api/products/:id`
- `POST|PUT|DELETE /api/categories[/:id]`
- `GET /api/admin/stats | customers | inventory | orders?status=`, `PUT /api/admin/orders/:id {status?, paymentStatus?}`

## Payments
Orders are Cash on Delivery: `payment.method = "cod"`, `payment.status = "pending"`. Nothing is ever marked paid automatically; an admin sets `paymentStatus` explicitly. The Order model already has `razorpayOrderId` / `razorpayPaymentId` fields; Razorpay later means adding a payment controller/route, not reshaping orders.

## Images -> S3 later
All image code lives in `services/storage.js` (`save(file) -> {url, key}`, `remove(key)`). Add an `s3` driver there and set `STORAGE_DRIVER=s3`; controllers do not change.

## Not done yet
Email sending (forgot-password link is printed to the server console outside production), Razorpay, automated tests, image resizing.
