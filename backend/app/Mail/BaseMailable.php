<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

abstract class BaseMailable extends Mailable
{
    use Queueable, SerializesModels;

    protected $headerTitle = 'LMS System';
    protected $title = 'Notification';

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->getSubject(),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: $this->getView(),
            with: array_merge($this->getViewData(), [
                'headerTitle' => $this->headerTitle,
                'title' => $this->title,
            ]),
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Get the email subject.
     * Override this in child classes.
     */
    abstract protected function getSubject(): string;

    /**
     * Get the view name.
     * Override this in child classes.
     */
    abstract protected function getView(): string;

    /**
     * Get the view data.
     * Override this in child classes.
     */
    abstract protected function getViewData(): array;
}

