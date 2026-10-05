<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthorProfile extends Model
{
    protected $appends = ['avatar_url'];
    protected $hidden = ['phone', 'review_note', 'reviewed_by', 'reviewed_at'];

    protected $fillable = [
        'user_id',
        'pen_name',
        'phone',
        'bio',
        'avatar',
        'status',
        'review_note',
        'reviewed_by',
        'reviewed_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        return \Illuminate\Support\Facades\Storage::disk(config('filesystems.media', 'public'))->url($this->avatar);
    }
}
