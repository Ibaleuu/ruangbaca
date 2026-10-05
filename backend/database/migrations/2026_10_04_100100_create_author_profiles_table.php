<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('author_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('pen_name', 100);
            $table->string('phone', 30);
            $table->text('bio');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('author_profiles');
    }
};
