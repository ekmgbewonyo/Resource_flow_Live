<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectBudget extends Model
{
    protected $fillable = [
        'project_id',
        'category',
        'item_name',
        'quantity',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    public const CATEGORY_MATERIAL = 'material';
    public const CATEGORY_TRANSPORTATION = 'transportation';
    public const CATEGORY_ADMIN = 'admin';
    public const CATEGORY_LABOR = 'labor';

    public const CATEGORIES = [
        self::CATEGORY_MATERIAL => 'Materials',
        self::CATEGORY_TRANSPORTATION => 'Transportation',
        self::CATEGORY_ADMIN => 'Admin/Overhead',
        self::CATEGORY_LABOR => 'Labor',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public static function boot()
    {
        parent::boot();
        static::saving(function ($model) {
            $model->total_cost = (float) $model->quantity * (float) $model->unit_cost;
        });
    }
}
