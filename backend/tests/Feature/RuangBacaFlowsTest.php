<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RuangBacaFlowsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_can_register_without_email_verification_and_log_in(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Pembaca Uji',
            'email' => 'pembaca@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()->assertJsonPath('user.role', 'reader')->assertJsonPath('email_verified', true);
        $this->assertDatabaseHas('users', ['email' => 'pembaca@example.test', 'role' => 'reader']);

        $this->postJson('/api/login', ['email' => 'pembaca@example.test', 'password' => 'password123'])
            ->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'role']]);
    }

    public function test_reader_can_view_article_save_reading_history_and_post_threaded_reply(): void
    {
        $reader = User::factory()->create(['role' => 'reader']);
        $author = User::factory()->create(['role' => 'writer']);
        $post = Post::create([
            'title' => 'Artikel Uji', 'slug' => 'artikel-uji', 'content' => 'Isi artikel.',
            'status' => 'published', 'review_status' => 'approved', 'published_at' => now(), 'user_id' => $author->id,
        ]);
        $tag = Tag::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $post->tags()->attach($tag);
        $root = Comment::create(['post_id' => $post->id, 'user_id' => $author->id, 'body' => 'Komentar utama', 'status' => 'approved']);

        $this->actingAs($reader, 'sanctum')->getJson('/api/posts/artikel-uji')->assertOk();
        $this->assertDatabaseHas('reading_histories', ['user_id' => $reader->id, 'post_id' => $post->id]);
        $this->actingAs($reader, 'sanctum')->getJson('/api/posts?tag=laravel')->assertOk()->assertJsonPath('data.0.slug', 'artikel-uji');

        $this->actingAs($reader, 'sanctum')->postJson('/api/posts/artikel-uji/comments', [
            'body' => 'Balasan uji', 'parent_id' => $root->id,
        ])->assertCreated();
        $reply = Comment::where('body', 'Balasan uji')->firstOrFail();
        $this->assertSame($root->id, $reply->parent_id);
        $this->assertSame('pending', $reply->status);
    }

    public function test_admin_can_moderate_a_published_submission(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $writer = User::factory()->create(['role' => 'writer']);
        $post = Post::create([
            'title' => 'Menunggu Moderasi', 'slug' => 'menunggu-moderasi', 'content' => 'Isi artikel.',
            'status' => 'published', 'review_status' => 'pending', 'published_at' => now(), 'user_id' => $writer->id,
        ]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/moderation')->assertOk()->assertJsonPath('counts.posts', 1);
        $this->postJson("/api/admin/posts/{$post->id}/review", ['decision' => 'approve'])->assertOk();
        $this->assertDatabaseHas('posts', ['id' => $post->id, 'review_status' => 'approved']);
    }

    public function test_forgot_password_sends_reset_notification_and_account_can_be_deleted(): void
    {
        Notification::fake();
        $user = User::factory()->create(['role' => 'reader']);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/account')->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
