<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('hicash:user:password')]
#[Description('Altera com segurança a senha do usuário autorizado do HiCash')]
class UpdateHiCashPassword extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = (string) $this->ask('E-mail');
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error('Usuário não encontrado.');

            return self::FAILURE;
        }

        $password = (string) $this->secret('Nova senha');
        $passwordConfirmation = (string) $this->secret('Confirme a nova senha');
        $validated = Validator::make([
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->letters()->numbers()->symbols()],
        ])->validate();

        $user->update(['password' => $validated['password']]);
        DB::table('sessions')->where('user_id', $user->id)->delete();

        $this->info('Senha atualizada e sessões existentes encerradas.');

        return self::SUCCESS;
    }
}
