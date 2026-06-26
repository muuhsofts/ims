<!DOCTYPE html>
<html>
<head>
    <title>Verification Failed – IMS</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            max-width: 550px;
            margin: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
        }
        .content {
            padding: 40px 30px;
        }
        .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h2 {
            color: #dc3545;
            margin: 0 0 10px;
        }
        .message {
            color: #555;
            margin: 20px 0;
            line-height: 1.5;
        }
        .button {
            display: inline-block;
            background: #2a5298;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
            font-weight: bold;
        }
        .button:hover {
            background: #1e3c72;
        }
        .footer {
            background: #f8f9fa;
            padding: 15px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #28a745;
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
            @if(session('resend_success'))
                <div class="alert-success">
                    {{ session('resend_success') }}
                </div>
            @endif

            <div class="error-icon">❌</div>
            <h2>Verification Failed</h2>
            <div class="message">
                <p>{{ $message }}</p>
                <p>Please request a new verification email.</p>
            </div>

            @if(isset($email))
            <form method="POST" action="{{ route('verification.resend') }}">
                @csrf
                <input type="hidden" name="email" value="{{ $email }}">
                <button type="submit" class="button" style="background: #6c757d; border: none; cursor: pointer;">Resend Verification Email</button>
            </form>
            @endif

            <div style="margin-top: 15px;">
                <a href="{{ config('app.frontend_url', 'https://imaratech.co.tz') }}" class="button">Go to Homepage</a>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} IMS – Inventory Management System. All rights reserved.
        </div>
    </div>
</body>
</html>