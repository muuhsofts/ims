<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\StockDistribution;

class DistributionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $distribution;
    public $type; // 'agent' or 'owner'

    public function __construct(StockDistribution $distribution, $type)
    {
        $this->distribution = $distribution;
        $this->type = $type;
    }

    public function build()
    {
        $subject = $this->type === 'agent' ? 'New Stock Distribution' : 'Stock Distribution Update';
        return $this->subject($subject)
                    ->view('emails.distribution')
                    ->with([
                        'distribution' => $this->distribution,
                        'type' => $this->type,
                        'appName' => config('app.name')
                    ]);
    }
}