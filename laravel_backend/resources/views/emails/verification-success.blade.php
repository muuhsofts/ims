<!DOCTYPE html>
<html>
<head>
    <title>Email Verified – IMS</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        .success-box {
            background: #d4edda;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .success-icon {
            font-size: 64px;
            margin-bottom: 10px;
        }
        .message {
            color: #666;
            line-height: 1.6;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .button {
            display: inline-block;
            background: #2a5298;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: bold;
        }
        .button:hover {
            background: #1e3c72;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ config('app.name', 'IMS') }}</h1>
            <p>Inventory Management System</p>
        </div>
        <div class="content">
            <div class="greeting">
                <strong>Hello {{ $name }}!</strong>
            </div>
            
            <div class="success-box">
                <div class="success-icon">✅</div>
                <h2 style="color: #28a745; margin: 0;">Email Verified Successfully</h2>
                <p style="margin-top: 10px;">Your email address <strong>{{ $email }}</strong> has been confirmed.</p>
            </div>
            
            <div class="message">
                <p>You can now log in to your IMS account and start managing inventory, sales, and stock.</p>
                <p>If you have any questions or need assistance, our support team is here to help.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{{ config('app.frontend_url', 'https://imaratech.co.tz') }}" class="button">Go to Dashboard</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} IMS – Inventory Management System. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p><small>Need help? Contact our support team.</small></p>
        </div>
    </div>
</body>
</html>