<!DOCTYPE html>
<html>
<head>
    <title>Password Expiry Warning</title>
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
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
        .warning-box {
            background: #ffebee;
            border-left: 4px solid #f44336;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .days-left {
            font-size: 36px;
            font-weight: bold;
            color: #f44336;
            text-align: center;
            margin: 20px 0;
        }
        .message {
            color: #666;
            line-height: 1.6;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: #f5576c;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ config('app.name') }}</h1>
            <p>Security Alert</p>
        </div>
        <div class="content">
            <div class="greeting">
                <strong>Hello {{ $user->name }}!</strong>
            </div>
            
            <div class="warning-box">
                <p style="margin: 0; font-weight: bold;">⚠️ Password Expiry Warning</p>
            </div>
            
            <div class="days-left">
                {{ $daysRemaining }} day(s) remaining
            </div>
            
            <div class="message">
                <p>Your password will expire in <strong>{{ $daysRemaining }} day(s)</strong>. For security reasons, we require you to change your password every 7 days.</p>
                <p>Please click the button below to change your password now to avoid any interruption in service.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{{ config('app.frontend_url') }}/change-password" class="button">Change Password Now</a>
            </div>
            
            <div class="message">
                <p>If you don't change your password before it expires, you will be required to reset it using the "Forgot Password" option.</p>
                <p>Thank you for keeping your account secure!</p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
            <p>This is an automated security notification.</p>
        </div>
    </div>
</body>
</html>