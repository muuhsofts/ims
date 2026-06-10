SHOP APP - API DOCUMENTATION
Base URL: http://172.18.5.73:8000/api

TEST CREDENTIALS
Role	Email	Password
ADMINISTRATOR	nyemamudhihirsoft01@gmail.com	password123
MANAGER	manager@inventory.com	password123
ADMIN	admin@inventory.com	password123
SELLER	seller@inventory.com	password123
User UUIDs:

Super Administrator: 293ee06c-54cc-4539-94a8-f7381c85fae9

John Manager: e46f975f-9c3c-466c-a100-b8017ebb6d24

Sarah Distributor: 79b9f57e-2d38-4b81-b843-b608096cdb8e

Mike Seller: 5723d655-6a8e-4e1a-93b4-0663d619ac0b

1. AUTHENTICATION API
1.1 Login
http
POST /auth/login
json
{
    "email": "manager@inventory.com",
    "password": "password123"
}

1.2 Register (Send OTP)
http
POST /auth/register
json
{
    "name": "New User",
    "email": "user@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "SELLER"
}

1.3 Verify OTP
http
POST /auth/verify-otp
json
{
    "email": "user@example.com",
    "otp": "123456"
}

1.4 Get Current User
http
GET /auth/me
Authorization: Bearer {token}

1.5 Logout
http
POST /auth/logout
Authorization: Bearer {token}

2. CATEGORY API
2.1 Get All Categories
http
GET /categories?per_page=15&status=active
Authorization: Bearer {token}

2.2 Get Single Category
http
GET /categories/{id}
Authorization: Bearer {token}

2.3 Create Category
http
POST /categories
Authorization: Bearer {token}
json
{
    "category_name": "Smartphones",
    "price": 699.99,
    "status": "active"
}

2.4 Update Category
http
PUT /categories/{id}
Authorization: Bearer {token}
json
{
    "price": 799.99,
    "status": "active"
}

2.5 Delete Category
http
DELETE /categories/{id}
Authorization: Bearer {token}

3. PRODUCT API

3.1 Get All Products
http
GET /products?per_page=20&status=in_stock
Authorization: Bearer {token}

3.2 Get My Products
http
GET /products/my-products
Authorization: Bearer {token}

3.3 Get Single Product
http
GET /products/{id}
Authorization: Bearer {token}

3.4 Create Product
http
POST /products
Authorization: Bearer {token}
json
{
    "product_name": "iPhone 15 Pro",
    "barcode": "890123456789001",
    "imei_number": "354987654321001",
    "category_id": 1,
    "brand": "Apple",
    "model": "15 Pro",
    "color": "Black",
    "storage": 256,
    "purchase_price": 999.99,
    "selling_price": 1299.99
}

3.5 Update Product
http
PUT /products/{id}
Authorization: Bearer {token}
json
{
    "selling_price": 1399.99,
    "color": "Blue"
}

3.6 Scan by Barcode
http
POST /products/scan-barcode
Authorization: Bearer {token}
json
{
    "barcode": "890123456789001"
}

3.7 Scan by IMEI
http
POST /products/scan-imei
Authorization: Bearer {token}
json
{
    "imei_number": "354987654321001"
}

4. DISTRIBUTION API
4.1 Get Available Products
http
GET /distribution/available
Authorization: Bearer {token}

4.2 Get Distribution History
http
GET /distribution/history
Authorization: Bearer {token}

4.3 Get Distribution Summary
http
GET /distribution/summary
Authorization: Bearer {token}

4.4 Distribute to Admin (Manager only)
http
POST /distribution/to-admin
Authorization: Bearer {manager_token}
json
{
    "product_id": 1,
    "admin_id": "79b9f57e-2d38-4b81-b843-b608096cdb8e",
    "notes": "Distribution notes"
}

4.5 Distribute to Seller (Admin only)
http
POST /distribution/to-seller
Authorization: Bearer {admin_token}
json
{
    "product_id": 1,
    "seller_id": "5723d655-6a8e-4e1a-93b4-0663d619ac0b",
    "notes": "Send to retail"
}

5. SALES API
5.1 Get All Sales
http
GET /sales?per_page=20
Authorization: Bearer {token}

5.2 Get Single Sale
http
GET /sales/{id}
Authorization: Bearer {token}

5.3 Create Sale (Seller only)
http
POST /sales
Authorization: Bearer {seller_token}
json
{
    "product_id": 1,
    "customer_name": "John Doe",
    "customer_phone": "+255123456789",
    "payment_status": "paid"
}

5.4 Update Payment Status
http
PUT /sales/{id}/payment-status
Authorization: Bearer {token}
json
{
    "payment_status": "paid"
}

5.5 Get Sales Report
http
GET /sales/reports?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer {token}
COMPLETE TEST FLOW
Step 1: Login as MANAGER
bash
curl -X POST http://172.18.5.73:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@inventory.com","password":"password123"}'
Step 2: Create Category
bash
curl -X POST http://172.18.5.73:8000/api/categories \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"category_name":"Test Cat","price":99.99}'
Step 3: Create Product
bash
curl -X POST http://172.18.5.73:8000/api/products \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name":"Test Phone",
    "barcode":"TEST001",
    "imei_number":"IMEI001",
    "category_id":1,
    "brand":"Test",
    "model":"T1",
    "purchase_price":500,
    "selling_price":800
  }'

Step 4: Distribute to Admin
bash
curl -X POST http://172.18.5.73:8000/api/distribution/to-admin \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":1,
    "admin_id":"79b9f57e-2d38-4b81-b843-b608096cdb8e"
  }'

Step 5: Login as ADMIN
bash
curl -X POST http://172.18.5.73:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inventory.com","password":"password123"}'
Step 6: Distribute to Seller
bash
curl -X POST http://172.18.5.73:8000/api/distribution/to-seller \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":1,
    "seller_id":"5723d655-6a8e-4e1a-93b4-0663d619ac0b"
  }'
  
Step 7: Login as SELLER
bash
curl -X POST http://172.18.5.73:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@inventory.com","password":"password123"}'
Step 8: Create Sale
bash
curl -X POST http://172.18.5.73:8000/api/sales \
  -H "Authorization: Bearer {seller_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":1,
    "customer_name":"John Doe",
    "payment_status":"paid"
  }'
STATUS CODES
Code	Description
200	Success
201	Created
400	Bad Request
401	Unauthorized
403	Forbidden
404	Not Found
422	Validation Error
500	Server Error