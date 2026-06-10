<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        .header { text-align: center; margin-bottom: 15px; }
        .shop-name { font-size: 18px; font-weight: bold; }
        .receipt-details { margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 5px; text-align: left; }
        .total { font-weight: bold; border-top: 1px solid #ccc; margin-top: 10px; padding-top: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="shop-name">{{ $shop_name }}</div>
        <div>Sales Receipt</div>
    </div>
    <div class="receipt-details">
        <p><strong>Receipt No:</strong> {{ $receipt->receipt_number }}</p>
        <p><strong>Date:</strong> {{ $date }}</p>
        <p><strong>Customer:</strong> {{ $sale->customer_name }}</p>
        <p><strong>Phone:</strong> {{ $sale->customer_phone ?? '-' }}</p>
        <p><strong>Seller:</strong> {{ $seller->name }}</p>
    </div>
    <table>
        <tr><th>Product</th><td>{{ $product->product_name }}</td></tr>
        @if($product->imei_number)
        <tr><th>IMEI</th><td>{{ $product->imei_number }}</td></tr>
        @endif
        <tr><th>Price</th><td>{{ number_format($sale->selling_price, 2) }}</td></tr>
        <tr><th>Payment Method</th><td>{{ ucfirst($sale->payment_method) }}</td></tr>
        <tr><th>Status</th><td>{{ ucfirst($sale->payment_status) }}</td></tr>
    </table>
    <div class="total">Total: {{ number_format($sale->selling_price, 2) }}</div>
    <div class="footer">Thank you for your purchase!</div>
</body>
</html>