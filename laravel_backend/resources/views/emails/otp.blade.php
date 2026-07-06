<!-- resources/views/emails/otp.blade.php -->
<!DOCTYPE html>
<html>
<head>
    <title>OTP Verification – IMS</title>
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
        .message {
            color: #666;
            line-height: 1.6;
            margin: 20px 0;
        }
        .otp-box {
            background: #f0f0f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
        }
        .otp-code {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 10px;
            color: #2a5298;
            font-family: monospace;
        }
        .otp-label {
            margin-top: 10px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
            border-radius: 4px;
        }
        .warning strong {
            display: block;
            margin-bottom: 5px;
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
            
            <div class="message">
                @if($type === 'reset')
                    <p>We received a request to reset your password. Use the OTP below to complete the process.</p>
                @else
                    <p>Thank you for registering with IMS. Please verify your email address to activate your account.</p>
                @endif
            </div>
            
            <div class="otp-box">
                <div class="otp-code">{{ $otp }}</div>
                <div class="otp-label">Enter this code to complete verification</div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                    <li>Do not share this code with anyone</li>
                    <li>Never enter this code on any unofficial website</li>
                </ul>
            </div>
            
            <div class="message" style="font-size: 14px; color: #888; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                @if($type === 'reset')
                    <p>If you didn't request a password reset, please ignore this email.</p>
                @else
                    <p>If you didn't create an account with IMS, please ignore this email.</p>
                @endif
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name', 'IMS') }} – All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>