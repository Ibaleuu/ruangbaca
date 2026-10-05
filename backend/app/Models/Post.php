<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    use HasFactory;

    protected $appends = ['cover_image_url'];
    protected $hidden = ['review_note', 'reviewed_by', 'reviewed_at'];

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'meta_description',
        'content',
        'cover_image',
        'status',
        'review_status',
        'review_note',
        'reviewed_by',
        'reviewed_at',
        'published_at',
        'user_id',
        'category_id',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'post_favorites')->withTimestamps();
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->orderBy('name');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function visibleComments(): HasMany
    {
        return $this->comments()->where('status', 'approved');
    }

    public function reports(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }

    public function getCoverImageUrlAttribute(): ?string
    {
        if (! $this->cover_image) {
            return null;
        }

        if (preg_match('/^(https?:|data:|blob:)/i', $this->cover_image)) {
            return $this->cover_image;
        }

        return \Illuminate\Support\Facades\Storage::disk(config('filesystems.media', 'public'))
            ->url($this->cover_image);
    }
}
