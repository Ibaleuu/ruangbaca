<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

class BackupDatabase extends Command
{
    protected $signature = 'blog:backup';
    protected $description = 'Buat backup database RuangBaca ke storage/app/private/backups';

    public function handle(): int
    {
        $directory = storage_path('app/private/backups');
        if (! is_dir($directory) && ! mkdir($directory, 0750, true) && ! is_dir($directory)) {
            $this->error('Folder backup tidak dapat dibuat.');
            return self::FAILURE;
        }

        $connection = config('database.default');
        $config = config("database.connections.$connection");
        $name = 'ruangbaca-'.now()->format('Ymd-His').'-'.Str::lower(Str::random(5));
        $driver = $config['driver'] ?? '';

        if ($driver === 'sqlite') {
            $source = $config['database'] ?? null;
            if (! $source || ! is_file($source)) {
                $this->error('File database SQLite tidak ditemukan.');
                return self::FAILURE;
            }
            $target = $directory.'/'.$name.'.sqlite';
            if (! copy($source, $target)) {
                $this->error('Backup SQLite gagal disalin.');
                return self::FAILURE;
            }
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            $target = $directory.'/'.$name.'.sql';
            $defaultBinary = PHP_OS_FAMILY === 'Windows' && is_file('C:/xampp/mysql/bin/mysqldump.exe')
                ? 'C:/xampp/mysql/bin/mysqldump.exe'
                : 'mysqldump';
            $binary = env('MYSQLDUMP_BINARY', $defaultBinary);
            $arguments = ['--single-transaction', '--quick', '--skip-lock-tables', '--host='.$config['host'], '--port='.$config['port'], '--user='.$config['username'], $config['database']];
            if (! empty($config['password'])) {
                $arguments[] = '--password='.$config['password'];
            }
            $result = Process::env(['MYSQL_PWD' => $config['password'] ?? ''])->timeout(300)->run(array_merge([$binary], $arguments));
            if (! $result->successful() || file_put_contents($target, $result->output()) === false || $result->output() === '') {
                @unlink($target);
                $this->error('mysqldump gagal. Pasang MySQL client atau atur MYSQLDUMP_BINARY; periksa kredensial database.');
                return self::FAILURE;
            }
        } else {
            $this->error("Driver database '$driver' belum didukung oleh perintah backup ini.");
            return self::FAILURE;
        }

        $this->info('Backup berhasil: '.$target);
        foreach (glob($directory.'/*') ?: [] as $oldFile) {
            if (is_file($oldFile) && filemtime($oldFile) < now()->subDays(30)->timestamp) @unlink($oldFile);
        }
        return self::SUCCESS;
    }
}
