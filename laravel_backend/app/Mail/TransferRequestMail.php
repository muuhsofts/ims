<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\TransferRequest;

class TransferRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public $transfer;
    public $type; // 'approver', 'requester'

    public function __construct(TransferRequest $transfer, $type)
    {
        $this->transfer = $transfer;
        $this->type = $type;
    }

    public function build()
    {
        $subject = match ($this->type) {
            'approver' => 'New Stock Transfer Request Pending Approval',
            'requester' => 'Your Stock Transfer Request #' . $this->transfer->request_id . ' has been ' . $this->transfer->status,
            default => 'Stock Transfer Notification'
        };
        return $this->subject($subject)
                    ->view('emails.transfer_request')
                    ->with([
                        'transfer' => $this->transfer,
                        'type' => $this->type,
                        'appName' => config('app.name')
                    ]);
    }
}