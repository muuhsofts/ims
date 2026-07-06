<?php

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

    public function __construct($otp, $name, $type = 'verification')
    {
        $this->otp = $otp;
        $this->name = $name;
        $this->type = $type;
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
                    ]);
    }
}