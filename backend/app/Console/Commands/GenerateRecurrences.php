<?php

namespace App\Console\Commands;

use App\Services\RecurrenceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('hicash:recurrences')]
#[Description('Gera as movimentações recorrentes pendentes até a data financeira atual')]
class GenerateRecurrences extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RecurrenceService $recurrences): int
    {
        try {
            $created = $recurrences->generate();

            Log::info('Geração de recorrências concluída.', ['created' => $created]);
            $this->info("Recorrências geradas: {$created}");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::error('Falha ao gerar recorrências.', [
                'exception' => $exception,
            ]);
            $this->error('Falha ao gerar recorrências. Consulte os logs.');

            return self::FAILURE;
        }
    }
}
