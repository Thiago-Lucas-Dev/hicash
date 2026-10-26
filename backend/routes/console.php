<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('hicash:recurrences')
    ->dailyAt('00:05')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping(60);
