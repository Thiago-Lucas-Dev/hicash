<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['service' => 'HiCash API', 'status' => 'ok']);
});

Route::get('/ready', function () {
    try {
        DB::select('SELECT 1');

        return response()->json(['status' => 'ok']);
    } catch (Throwable $exception) {
        report($exception);

        return response()->json(['status' => 'unavailable'], 503);
    }
});
