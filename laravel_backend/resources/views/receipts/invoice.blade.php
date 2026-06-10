<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice</title>

    <style>
        body{
            font-family: DejaVu Sans;
            font-size:14px;
        }

        .title{
            text-align:center;
            margin-bottom:20px;
        }

        table{
            width:100%;
            border-collapse:collapse;
        }

        table,th,td{
            border:1px solid #000;
        }

        th,td{
            padding:8px;
        }
    </style>
</head>
<body>

<h2 class="title">
    SALES INVOICE
</h2>

<p>
    <strong>Invoice:</strong>
    {{ $receiptNumber }}
</p>

<p>
    <strong>Date:</strong>
    {{ now() }}
</p>

<hr>

<h3>Customer</h3>

<p>Name: {{ $customer->full_name }}</p>

<p>Phone: {{ $customer->phone }}</p>

<hr>

<table>

<tr>
    <th>Sale ID</th>
    <th>Amount</th>
    <th>Payment Method</th>
</tr>

<tr>
    <td>{{ $sale->sale_id }}</td>
    <td>{{ number_format($sale->total_amount,2) }}</td>
    <td>{{ $sale->payment_method }}</td>
</tr>

</table>

<br>

<h3>
Total:
TZS {{ number_format($sale->total_amount,2) }}
</h3>

<p>
Status: PAID
</p>

</body>
</html>