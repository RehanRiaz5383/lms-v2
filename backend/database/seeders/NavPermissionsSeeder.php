<?php

namespace Database\Seeders;

use App\Models\NavPermission;
use App\Models\UserType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NavPermissionsSeeder extends Seeder
{
    /**
     * Seed sidebar / route permissions and default role assignments.
     */
    public function run(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('nav_permissions')) {
            $this->command?->warn('nav_permissions table missing — run migrations first.');

            return;
        }

        $definitions = $this->definitions();
        $sort = 0;
        foreach ($definitions as $row) {
            NavPermission::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'label' => $row['label'],
                    'route_path' => $row['route_path'] ?? null,
                    'audience' => $row['audience'],
                    'sort_order' => $sort++,
                ]
            );
        }

        $byAudience = function (string $audience): array {
            return NavPermission::query()->where('audience', $audience)->pluck('id')->all();
        };

        $adminIds = $byAudience('admin');
        $studentIds = $byAudience('student');
        $teacherIds = $byAudience('teacher');

        if ($admin = UserType::query()->find(1)) {
            $admin->navPermissions()->sync($adminIds);
        }
        if ($student = UserType::query()->find(2)) {
            $student->navPermissions()->sync($studentIds);
        }
        if ($teacher = UserType::query()->find(3)) {
            $teacher->navPermissions()->sync($teacherIds);
        }
        if ($cr = UserType::query()->find(4)) {
            $cr->navPermissions()->sync($teacherIds);
        }

        $this->command?->info('Nav permissions seeded and linked to default roles.');
    }

    /**
     * @return list<array{slug: string, label: string, route_path: ?string, audience: string}>
     */
    private function definitions(): array
    {
        return [
            // Admin (order = sort_order; mirrors sidebar: Management → Academics → … → Settings)
            ['slug' => 'admin.dashboard', 'label' => 'Dashboard', 'route_path' => '/dashboard', 'audience' => 'admin'],
            ['slug' => 'admin.inbox', 'label' => 'Inbox', 'route_path' => '/dashboard/inbox', 'audience' => 'admin'],
            ['slug' => 'admin.management.users', 'label' => 'User Management', 'route_path' => '/dashboard/users', 'audience' => 'admin'],
            ['slug' => 'admin.academics.batches', 'label' => 'Batch Management', 'route_path' => '/dashboard/batches', 'audience' => 'admin'],
            ['slug' => 'admin.academics.subjects', 'label' => 'Subjects', 'route_path' => '/dashboard/subjects', 'audience' => 'admin'],
            ['slug' => 'admin.academics.videos', 'label' => 'Videos', 'route_path' => '/dashboard/videos', 'audience' => 'admin'],
            ['slug' => 'admin.academics.tasks', 'label' => 'Tasks', 'route_path' => '/dashboard/admin-tasks', 'audience' => 'admin'],
            ['slug' => 'admin.tools.pending_task_submissions', 'label' => 'Pending submissions (Academics)', 'route_path' => '/dashboard/pending-task-submissions', 'audience' => 'admin'],
            ['slug' => 'admin.accounts.fee_vouchers', 'label' => 'Fee Vouchers', 'route_path' => '/dashboard/fee-vouchers', 'audience' => 'admin'],
            ['slug' => 'admin.accounts.expenses', 'label' => 'Expense Management', 'route_path' => '/dashboard/expenses', 'audience' => 'admin'],
            ['slug' => 'admin.accounts.income_expense_report', 'label' => 'Income & Expense Report', 'route_path' => '/dashboard/income-expense-report', 'audience' => 'admin'],
            ['slug' => 'admin.reports.income', 'label' => 'Income Report', 'route_path' => '/dashboard/reports/income', 'audience' => 'admin'],
            ['slug' => 'admin.documents', 'label' => 'Documents', 'route_path' => '/dashboard/documents', 'audience' => 'admin'],
            ['slug' => 'admin.settings.smtp', 'label' => 'SMTP Settings', 'route_path' => '/dashboard/settings/smtp', 'audience' => 'admin'],
            ['slug' => 'admin.settings.notifications', 'label' => 'Notifications (admin)', 'route_path' => '/dashboard/settings/notifications', 'audience' => 'admin'],
            ['slug' => 'admin.settings.scheduled_jobs', 'label' => 'Scheduled Jobs', 'route_path' => '/dashboard/scheduled-jobs', 'audience' => 'admin'],
            ['slug' => 'admin.settings.google_drive_folders', 'label' => 'Google Drive Folders', 'route_path' => '/dashboard/settings/google-drive-folders', 'audience' => 'admin'],
            ['slug' => 'admin.integrations.internal', 'label' => 'Internal integrations (Settings)', 'route_path' => '/dashboard/integrations/internal', 'audience' => 'admin'],
            ['slug' => 'admin.settings.roles', 'label' => 'Roles & Permissions', 'route_path' => '/dashboard/settings/roles', 'audience' => 'admin'],

            // Student
            ['slug' => 'student.dashboard', 'label' => 'Dashboard', 'route_path' => '/dashboard', 'audience' => 'student'],
            ['slug' => 'student.inbox', 'label' => 'Inbox', 'route_path' => '/dashboard/inbox', 'audience' => 'student'],
            ['slug' => 'student.lecture_videos', 'label' => 'Lecture Videos', 'route_path' => '/dashboard/lecture-videos', 'audience' => 'student'],
            ['slug' => 'student.tasks', 'label' => 'Tasks', 'route_path' => '/dashboard/tasks', 'audience' => 'student'],
            ['slug' => 'student.quizzes', 'label' => 'Quizzes', 'route_path' => '/dashboard/quizzes', 'audience' => 'student'],
            ['slug' => 'student.class_participations', 'label' => 'Class Participations', 'route_path' => '/dashboard/class-participations', 'audience' => 'student'],
            ['slug' => 'student.account_book', 'label' => 'Account Book', 'route_path' => '/dashboard/account-book', 'audience' => 'student'],
            ['slug' => 'student.settings.notifications', 'label' => 'Notifications (student)', 'route_path' => '/dashboard/settings/notifications', 'audience' => 'student'],
            ['slug' => 'student.performance_report', 'label' => 'Performance Report', 'route_path' => '/dashboard/performance-report', 'audience' => 'student'],
            ['slug' => 'student.academic_calendar', 'label' => 'Academic Calendar', 'route_path' => '/dashboard/academic-calendar', 'audience' => 'student'],
            ['slug' => 'student.notifications', 'label' => 'Notification detail', 'route_path' => '/dashboard/notifications', 'audience' => 'student'],

            // Teacher / CR
            ['slug' => 'teacher.dashboard', 'label' => 'Dashboard', 'route_path' => '/dashboard', 'audience' => 'teacher'],
            ['slug' => 'teacher.inbox', 'label' => 'Inbox', 'route_path' => '/dashboard/inbox', 'audience' => 'teacher'],
            ['slug' => 'teacher.academics.batches', 'label' => 'Batch Management', 'route_path' => '/dashboard/batches', 'audience' => 'teacher'],
        ];
    }
}
