<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

class RestoreDatabase extends Command
{
    protected $signature = 'blog:restore {file : Nama file backup dari storage/app/private/backups} {--force : Jalankan tanpa prompt konfirmasi}';
    protected $description = 'Pulihkan database RuangBaca dari backup';

    public function handle(): int
    {
        $directory = realpath(storage_path('app/private/backups'));
        $candidate = storage_path('app/private/backups/'.$this->argument('file'));
        $file = realpath($candidate);
        if (! $directory || ! $file || ! str_starts_with($file, $directory.DIRECTORY_SEPARATOR) || ! is_file($file)) {
            $this->error('File backup tidak ditemukan atau jalurnya tidak diizinkan.');
            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('Pemulihan akan menimpa data saat ini. Lanjutkan?')) {
            return self::SUCCESS;
        }

        // Preserve the current database before any destructive restore.
        if ($this->call('blog:backup') !== self::SUCCESS) {
            $this->error('Restore dibatalkan karena backup kondisi saat ini gagal dibuat.');
            return self::FAILURE;
        }

        $connection = config('database.default');
        $config = config("database.connections.$connection");
        if (($config['driver'] ?? '') === 'sqlite' && str_ends_with($file, '.sqlite')) {
            if (! copy($file, $config['database'])) {
                $this->error('Pemulihan SQLite gagal.');
                return self::FAILURE;
            }
        } elseif (in_array($config['driver'] ?? '', ['mysql', 'mariadb'], true) && str_ends_with($file, '.sql')) {
            $defaultBinary = PHP_OS_FAMILY === 'Windows' && is_file('C:/xampp/mysql/bin/mysql.exe')
                ? 'C:/xampp/mysql/bin/mysql.exe'
                : 'mysql';
            $binary = env('MYSQL_BINARY', $defaultBinary);
            $arguments = ['--host='.$config['host'], '--port='.$config['port'], '--user='.$config['username']];
            if (! empty($config['password'])) $arguments[] = '--password='.$config['password'];
            $arguments[] = $config['database'];
            $result = Process::env(['MYSQL_PWD' => $config['password'] ?? ''])->timeout(600)->input(file_get_contents($file))->run(array_merge([$binary], $arguments));
            if (! $result->successful()) {
                $this->error('Restore MySQL gagal: '.$result->errorOutput());
                return self::FAILURE;
            }
        } else {
            $this->error('Jenis file backup tidak cocok dengan driver database aktif.');
            return self::FAILURE;
        }

        $this->info('Database berhasil dipulihkan.');
        return self::SUCCESS;
    }
}
