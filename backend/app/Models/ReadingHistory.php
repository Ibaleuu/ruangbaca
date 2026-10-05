<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingHistory extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'post_id', 'last_read_at'];

    protected function casts(): array
    {
        return ['last_read_at' => 'datetime'];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}
