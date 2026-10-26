<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\FinanceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('web')->group(function () {
    Route::get('auth/csrf', [AuthController::class, 'csrf']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('dashboard', [FinanceController::class, 'dashboard']);
        Route::get('reports', [FinanceController::class, 'reports']);
        Route::get('settings', [FinanceController::class, 'settings']);
        Route::put('settings', [FinanceController::class, 'saveSettings']);
        Route::get('chat/messages', [ChatController::class, 'messages']);
        Route::post('chat/commands', [ChatController::class, 'command']);
        Route::get('categories/aliases', [FinanceController::class, 'aliases']);
        Route::post('categories/aliases', [FinanceController::class, 'storeAlias']);
        Route::delete('categories/aliases/{id}', [FinanceController::class, 'destroyAlias']);
        Route::post('transactions/{id}/status', [FinanceController::class, 'status']);
        Route::post('recurrences/generate', [FinanceController::class, 'generateRecurrences']);
        Route::post('recurrences/{id}/future', [FinanceController::class, 'updateFutureRecurrence']);
        foreach (['accounts', 'categories', 'transactions', 'transfers', 'budgets', 'recurrences'] as $resource) {
            Route::get($resource, [FinanceController::class, 'index'])->defaults('resource', $resource);
            Route::post($resource, [FinanceController::class, 'store'])->defaults('resource', $resource);
            Route::put("$resource/{id}", [FinanceController::class, 'update'])->defaults('resource', $resource);
            Route::delete("$resource/{id}", [FinanceController::class, 'destroy'])->defaults('resource', $resource);
        }
    });
});
