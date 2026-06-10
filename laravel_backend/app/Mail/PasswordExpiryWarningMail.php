<?php
namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordExpiryWarningMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $daysRemaining;

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->daysRemaining = $user->getPasswordExpiryDaysRemaining();
    }

    public function build()
    {
        return $this->subject('Password Expiry Warning - ' . config('app.name'))
                    ->view('emails.password_expiry_warning');
    }
}