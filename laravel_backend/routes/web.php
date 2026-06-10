<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\VerificationWebController;

Route::get('/login', function () {
    return response()->json([
        'success' => false,
        'message' => 'Unauthenticated. Please provide a valid token.'
    ], 401);
})->name('login');

Route::get('/', function () {
    return view('welcome');
});

// Email verification page (from the link in email)
Route::get('/verify-email', [VerificationWebController::class, 'verifyEmail'])->name('verification.verify');

// Resend verification email
Route::post('/resend-verification', [VerificationWebController::class, 'resendVerification'])->name('verification.resend');