<?php
// app/Mail/OTPMail.php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OTPMail extends Mailable
{
    use Queueable, SerializesModels;

    public $otp;
    public $name;
    public $type;
    public $verificationLink;

    public function __construct($otp, $name, $type = 'verification', $verificationLink = null)
    {
        $this->otp = $otp;
        $this->name = $name;
        $this->type = $type;
        $this->verificationLink = $verificationLink;
    }

    public function build()
    {
        $subject = $this->type === 'reset' ? 'Password Reset OTP' : 'Email Verification OTP';
        
        return $this->subject($subject . ' - ' . config('app.name'))
                    ->view('emails.otp')
                    ->with([
                        'otp' => $this->otp,
                        'name' => $this->name,
                        'type' => $this->type,
                        'verificationLink' => $this->verificationLink
                    ]);
    }
}