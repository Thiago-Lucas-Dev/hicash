<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('hicash:create-user')]
#[Description('Create the sole HiCash user in an empty user table')]
class CreateInitialUser extends Command
{
    public function handle(): int
    {
        if (User::query()->exists()) {
            $this->error('Já existe um usuário. Nenhuma alteração foi feita.');

            return self::FAILURE;
        }

        if (! $this->input->isInteractive()) {
            $this->error('Execute este comando em um terminal interativo; a senha não é aceita por argumento.');

            return self::FAILURE;
        }

        $name = $this->ask('Nome');
        $email = $this->ask('E-mail');
        $password = $this->secret('Senha');
        $password_confirmation = $this->secret('Confirme a senha');

        $validator = Validator::make(compact('name', 'email', 'password', 'password_confirmation'), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        if (User::query()->exists()) {
            $this->error('Já existe um usuário. Nenhuma alteração foi feita.');

            return self::FAILURE;
        }

        User::query()->create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);
        $this->info('Usuário criado.');

        return self::SUCCESS;
    }
}
