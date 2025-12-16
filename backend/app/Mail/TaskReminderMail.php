<?php

namespace App\Mail;

use Illuminate\Contracts\Queue\ShouldQueue;

class TaskReminderMail extends BaseMailable implements ShouldQueue
{
    public $taskTitle;
    public $reminderHours;
    public $formattedDate;
    public $studentName;

    /**
     * Create a new message instance.
     */
    public function __construct(string $taskTitle, int $reminderHours, string $formattedDate, string $studentName)
    {
        $this->taskTitle = $taskTitle;
        $this->reminderHours = $reminderHours;
        $this->formattedDate = $formattedDate;
        $this->studentName = $studentName;
        $this->headerTitle = 'Task Reminder';
        $this->title = 'Task Reminder';
    }

    /**
     * Get the email subject.
     */
    protected function getSubject(): string
    {
        return "Task Reminder: {$this->reminderHours} Hours Remaining - {$this->taskTitle}";
    }

    /**
     * Get the view name.
     */
    protected function getView(): string
    {
        return 'emails.task-reminder';
    }

    /**
     * Get the view data.
     */
    protected function getViewData(): array
    {
        return [
            'taskTitle' => $this->taskTitle,
            'reminderHours' => $this->reminderHours,
            'formattedDate' => $this->formattedDate,
            'studentName' => $this->studentName,
        ];
    }
}
