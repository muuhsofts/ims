<!-- resources/views/emails/verification-success.blade.php -->
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
        .header p {
            margin: 5px 0 0;
            opacity: 0.9;
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
        .info-box {
            background: #e8f4fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            border-radius: 4px;
        }
        .info-box ul {
            margin: 5px 0 0 20px;
            padding: 0;
        }
        .info-box ul li {
            margin-bottom: 4px;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .footer p {
            margin: 5px 0;
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
        .verification-details {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .verification-details strong {
            color: #333;
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
                <strong>Hello {{ $name ?? $user->name ?? 'User' }}!</strong>
            </div>
            
            <div class="success-box">
                <div class="success-icon">✅</div>
                <h2 style="color: #28a745; margin: 0;">Email Verified Successfully</h2>
                <p style="margin-top: 10px;">Your email address <strong>{{ $email ?? $user->email ?? '' }}</strong> has been confirmed.</p>
            </div>
            
            <div class="message">
                <p>Your account is now active and ready to use. You can now:</p>
                <ul>
                    <li>Log in to your IMS account</li>
                    <li>Manage inventory, sales, and stock</li>
                    <li>Access all features based on your role</li>
                </ul>
            </div>
            
            <div class="verification-details">
                <p><strong>Account Details:</strong></p>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li><strong>Name:</strong> {{ $name ?? $user->name ?? 'N/A' }}</li>
                    <li><strong>Email:</strong> {{ $email ?? $user->email ?? 'N/A' }}</li>
                    <li><strong>Status:</strong> Active</li>
                </ul>
            </div>
            
            <div class="info-box">
                <strong>💡 Quick Tips:</strong>
                <ul>
                    <li>Keep your password secure and change it regularly</li>
                    <li>Enable two-factor authentication for extra security</li>
                    <li>Log out from shared devices after each session</li>
                </ul>
            </div>
            
           
            
            <div class="message" style="font-size: 14px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
                <p>If you have any questions or need assistance, our support team is here to help.</p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name', 'IMS') }} – Inventory Management System. All rights reserved.</p>
            <p><small>Need help? Contact our support team at <a href="mailto:support@imaratech.co.tz" style="color: #2a5298;">support@imaratech.co.tz</a></small></p>
        </div>
    </div>
</body>
</html>