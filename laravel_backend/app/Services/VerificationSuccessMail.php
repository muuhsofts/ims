<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerificationSuccessMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $name;
    public $email;

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->name = $user->name;
        $this->email = $user->email;
    }

    public function build()
    {
        return $this->subject('Email Verified Successfully - ' . config('app.name'))
                    ->view('emails.verification-success')
                    ->with([
                        'user' => $this->user,
                        'name' => $this->name,
                        'email' => $this->email,
                    ]);
    }
}