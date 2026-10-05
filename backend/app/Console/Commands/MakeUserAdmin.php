<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeUserAdmin extends Command
{
    protected $signature = 'blog:make-admin {email : Email akun yang sudah terdaftar}';

    protected $description = 'Jadikan akun terdaftar sebagai administrator RuangBaca';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('Akun tidak ditemukan. Daftarkan akun terlebih dahulu.');
            return self::FAILURE;
        }

        $user->forceFill([
            'role' => 'admin',
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $this->info("{$user->email} sekarang menjadi admin RuangBaca.");
        return self::SUCCESS;
    }
}
