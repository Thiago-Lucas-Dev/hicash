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
#[Description('Change the HiCash user password and invalidate active sessions')]
class UpdateHiCashPassword extends Command
{
    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Execute este comando em um terminal interativo; a senha não é aceita por argumento.');

            return self::FAILURE;
        }

        $email = (string) $this->ask('E-mail');
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error('Usuário não encontrado.');

            return self::FAILURE;
        }

        $password = $this->secret('Nova senha');
        $passwordConfirmation = $this->secret('Confirme a nova senha');
        $validator = Validator::make([
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        DB::transaction(function () use ($user, $password): void {
            $user->update(['password' => $password]);
            DB::table('sessions')->where('user_id', $user->id)->delete();
        });

        $this->info('Senha atualizada e sessões existentes encerradas.');

        return self::SUCCESS;
    }
}
