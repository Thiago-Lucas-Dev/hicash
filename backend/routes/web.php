<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'HiCash API',
        'status' => 'ok',
    ]);
});
