<!DOCTYPE html>
<html>
<head>
    <title>Stock Distribution Notification</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .info {
            background: #f8f9fa;
            border-left: 4px solid #2a5298;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .progress {
            background: #e9ecef;
            border-radius: 20px;
            height: 20px;
            margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar {
            background: #28a745;
            height: 100%;
            text-align: center;
            line-height: 20px;
            color: white;
            font-size: 12px;
        }
        .footer {
            background: #f8f9fa;
            padding: 15px;
            font-size: 12px;
            text-align: center;
            color: #999;
            border-top: 1px solid #eee;
        }
        .button {
            display: inline-block;
            background: #2a5298;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $appName }}</h1>
            <p>Stock Distribution Notification</p>
        </div>
        <div class="content">
            <h2>Dear {{ $distribution->user->name ?? 'Sales Agent' }},</h2>

            @if($type == 'agent')
                <p>A new stock distribution has been created for you.</p>
                <div class="info">
                    <p><strong>Product:</strong> {{ $distribution->product->imei ?? 'N/A' }} ({{ $distribution->product->color ?? 'N/A' }})</p>
                    <p><strong>Total Quantity:</strong> {{ $distribution->quantity }}</p>
                    <p><strong>From Collection Center:</strong> {{ $distribution->collectionCenter->cc_name ?? 'N/A' }}</p>
                    <p><strong>Notes:</strong> {{ $distribution->notes ?? 'None' }}</p>
                </div>

                @if($distribution->quantity_received < $distribution->quantity)
                    <div class="progress">
                        <div class="progress-bar" style="width: {{ ($distribution->quantity_received / max($distribution->quantity,1)) * 100 }}%;">
                            {{ $distribution->quantity_received }} / {{ $distribution->quantity }}
                        </div>
                    </div>
                    <p><strong>Received so far:</strong> {{ $distribution->quantity_received }} of {{ $distribution->quantity }}</p>
                    <p>Please scan the product(s) to confirm receipt. You will receive an update each time you scan.</p>
                    <a href="{{ url('/agent/dashboard') }}" class="button">Go to Dashboard</a>
                @else
                    <div class="info" style="border-left-color: #28a745;">
                        <p>✅ <strong>All products have been received!</strong></p>
                        <p>Thank you for confirming receipt. The stock is now in your inventory.</p>
                    </div>
                    <a href="{{ url('/agent/inventory') }}" class="button">View My Inventory</a>
                @endif
            @else
                <p>A stock distribution has been updated.</p>
                <div class="info">
                    <p><strong>Product:</strong> {{ $distribution->product->imei ?? 'N/A' }}</p>
                    <p><strong>Quantity:</strong> {{ $distribution->quantity }}</p>
                    <p><strong>To Agent:</strong> {{ $distribution->user->name ?? 'N/A' }}</p>
                    <p><strong>Status:</strong> 
                        @if($distribution->quantity_received >= $distribution->quantity)
                            Fully received
                        @else
                            {{ $distribution->quantity_received }} of {{ $distribution->quantity }} received
                        @endif
                    </p>
                </div>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ $appName }}. All rights reserved.
        </div>
    </div>
</body>
</html>