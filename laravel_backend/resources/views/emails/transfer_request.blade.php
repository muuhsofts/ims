<!DOCTYPE html>
<html>
<head>
    <title>Stock Transfer Notification</title>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .item-list { background: #f9f9f9; border-left: 4px solid #2a5298; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .item-list ul { margin: 0; padding-left: 20px; }
        .item-list li { margin: 8px 0; }
        .footer { background: #f8f9fa; padding: 15px; font-size: 12px; text-align: center; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $appName }}</h1>
            <p>Stock Transfer Request</p>
        </div>
        <div class="content">
            @if($type == 'approver')
                <h2>📦 New Transfer Request</h2>
                <p><strong>To Collection Center:</strong> {{ $transfer->collectionCenter->cc_name ?? 'N/A' }}</p>
                <p><strong>Requested by:</strong> {{ $transfer->requester->name ?? 'N/A' }}</p>
                <p><strong>Notes:</strong> {{ $transfer->notes ?? 'None' }}</p>

                <h3>📋 Requested Items:</h3>
                <div class="item-list">
                    <ul>
                        @foreach($transfer->requested_items as $item)
                            <li>
                                <strong>{{ $item['category_name'] ?? 'N/A' }}</strong>
                                @if(!empty($item['model'])) – Model: {{ $item['model'] }} @endif
                                @if(!empty($item['quantity'])) – Quantity: {{ $item['quantity'] }} @endif
                                @if(!empty($item['skus']) && is_array($item['skus']))
                                    <br>SKU(s): {{ implode(', ', $item['skus']) }}
                                @endif
                                @if(!empty($item['description']))
                                    <br><span style="color:#666;">Description: {{ $item['description'] }}</span>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                </div>
                <p>Please log in to the system to approve or reject this request.</p>

            @elseif($type == 'requester')
                <h2>Your Transfer Request #{{ $transfer->request_id }}</h2>
                <p><strong>Status:</strong> 
                    @if($transfer->status == 'approved')
                        ✅ Approved – Stock has been transferred to your collection center.
                    @elseif($transfer->status == 'rejected')
                        ❌ Rejected – Please contact the administrator.
                    @elseif($transfer->status == 'completed')
                        ✅ Completed – You have confirmed receipt.
                    @else
                        ⏳ Pending approval.
                    @endif
                </p>
                @if($transfer->status == 'approved')
                    <p>Please log in to confirm receipt once you receive the stock.</p>
                @elseif($transfer->status == 'completed')
                    <p>Thank you for confirming receipt. The stock is now in your collection center.</p>
                @endif
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ $appName }}. All rights reserved.
        </div>
    </div>
</body>
</html>