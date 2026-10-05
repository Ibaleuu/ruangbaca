<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationEvent extends Model
{
    protected $fillable = ['admin_id', 'action', 'subject_type', 'subject_id', 'subject_label', 'note'];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
