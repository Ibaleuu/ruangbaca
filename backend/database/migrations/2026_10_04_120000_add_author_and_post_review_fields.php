<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('author_profiles', function (Blueprint $table) {
            $table->string('status')->default('approved')->after('bio');
            $table->text('review_note')->nullable()->after('status');
            $table->foreignId('reviewed_by')->nullable()->after('review_note')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->string('review_status')->default('approved')->after('status');
            $table->text('review_note')->nullable()->after('review_status');
            $table->foreignId('reviewed_by')->nullable()->after('review_note')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });

        // Existing accounts and published posts continue working after rollout.
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['review_status', 'review_note', 'reviewed_by', 'reviewed_at']);
        });

        Schema::table('author_profiles', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['status', 'review_note', 'reviewed_by', 'reviewed_at']);
        });
    }
};
