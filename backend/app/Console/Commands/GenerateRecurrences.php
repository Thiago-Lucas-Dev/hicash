<?php

namespace App\Console\Commands;

use App\Services\RecurrenceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('hicash:generate-recurrences')]
#[Description('Generate due pending financial recurrences')]
class GenerateRecurrences extends Command
{
    public function handle(RecurrenceService $recurrences): int
    {
        try {
            $created = $recurrences->generate();
            $this->info("Recorrências geradas: {$created}");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::error('Falha ao gerar recorrências.', [
                'type' => $exception::class,
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ]);
            $this->error('Falha ao gerar recorrências. Consulte os logs.');

            return self::FAILURE;
        }
    }
}
