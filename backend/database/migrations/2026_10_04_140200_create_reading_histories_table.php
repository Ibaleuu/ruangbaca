<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_read_at');
            $table->unique(['user_id', 'post_id']);
            $table->index(['user_id', 'last_read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_histories');
    }
};
