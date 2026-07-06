<!DOCTYPE html>
<html>
<head>
    <title>Email Verified – IMS</title>
</head>
<body style="font-family: Arial; background:#f4f4f4; padding:20px;">

<div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;">
    
    <div style="background:#2a5298;color:white;padding:20px;text-align:center;">
        <h2>{{ config('app.name', 'IMS') }}</h2>
        <p>Inventory Management System</p>
    </div>

    <div style="padding:30px;text-align:center;">
        <h2 style="color:green;">Email Verified Successfully</h2>

        <p>Hello <b>{{ $user->name }}</b></p>
        <p>Your email <b>{{ $user->email }}</b> is now verified.</p>

      
    </div>

</div>

</body>
</html>