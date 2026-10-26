<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('hicash:user:create')]
#[Description('Cria o único usuário autorizado do HiCash')]
class CreateHiCashUser extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (User::query()->exists()) {
            $this->error('Já existe um usuário autorizado. Use hicash:user:password para alterar a senha.');

            return self::FAILURE;
        }

        $name = (string) $this->ask('Nome');
        $email = (string) $this->ask('E-mail');
        $password = (string) $this->secret('Senha');
        $passwordConfirmation = (string) $this->secret('Confirme a senha');

        $credentials = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->letters()->numbers()->symbols()],
        ])->validate();

        User::query()->create([
            'name' => $credentials['name'],
            'email' => $credentials['email'],
            'password' => $credentials['password'],
        ]);

        $this->info('Usuário autorizado criado com sucesso.');

        return self::SUCCESS;
    }
}
