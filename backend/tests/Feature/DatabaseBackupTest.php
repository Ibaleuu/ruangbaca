<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseBackupTest extends TestCase
{
    public function test_sqlite_backup_can_be_restored(): void
    {
        $databasePath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'ruangbaca-'.uniqid('', true).'.sqlite';
        touch($databasePath);
        $backupDirectory = storage_path('app/private/backups');
        $filesBefore = glob($backupDirectory.'/ruangbaca-*') ?: [];
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => $databasePath]);
        DB::purge('sqlite');

        try {
            Schema::create('backup_probe', function ($table): void {
                $table->id();
                $table->string('value');
            });
            DB::table('backup_probe')->insert(['value' => 'before']);

            $this->assertSame(0, Artisan::call('blog:backup'));
            $backupFiles = array_values(array_diff(glob($backupDirectory.'/ruangbaca-*.sqlite') ?: [], $filesBefore));
            $this->assertCount(1, $backupFiles);

            DB::table('backup_probe')->update(['value' => 'after']);
            $this->assertSame(0, Artisan::call('blog:restore', ['file' => basename($backupFiles[0]), '--force' => true]));
            $this->assertSame('before', DB::table('backup_probe')->value('value'));
        } finally {
            DB::disconnect('sqlite');
            @unlink($databasePath);
            foreach (array_diff(glob($backupDirectory.'/ruangbaca-*') ?: [], $filesBefore) as $file) @unlink($file);
        }
    }
}
