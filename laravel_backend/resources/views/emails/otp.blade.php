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
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        .otp-box {
            background: #f0f0f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .otp-code {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 10px;
            color: #2a5298;
            font-family: monospace;
        }
        .message {
            color: #666;
            line-height: 1.6;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
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
        .divider {
            text-align: center;
            margin: 25px 0;
            position: relative;
        }
        .divider:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #e0e0e0;
        }
        .divider span {
            background: white;
            padding: 0 15px;
            position: relative;
            color: #999;
            font-size: 14px;
        }
        .verification-link-box {
            text-align: center;
            margin: 20px 0;
        }
        .note {
            font-size: 12px;
            color: #999;
            text-align: center;
            margin-top: 15px;
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
            
            <!-- OTP Code Section -->
            <div class="otp-box">
                <div class="otp-code">{{ $otp }}</div>
                <p style="margin-top: 10px; color: #666;">Enter this code to continue</p>
            </div>
            
            <!-- Verification Link Section (if provided) -->
            @if(isset($verificationLink) && $verificationLink)
            <div class="divider">
                <span>OR</span>
            </div>
            
            <div class="verification-link-box">
                <a href="{{ $verificationLink }}" class="button">
                    @if($type === 'reset')
                        Reset Password Instantly
                    @else
                        Verify Email Instantly
                    @endif
                </a>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    Click the button above to {{ $type === 'reset' ? 'reset your password' : 'verify your email' }} instantly
                </p>
            </div>
            @endif
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This OTP is valid for <strong>10 minutes</strong> only.
                For security reasons, do not share this code with anyone.
            </div>
            
            <div class="message">
                <p style="font-size: 14px;">
                    @if($type === 'reset')
                        If you didn't request a password reset, please ignore this email or contact support.
                    @else
                        If you didn't create an account with IMS, please ignore this email.
                    @endif
                </p>
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