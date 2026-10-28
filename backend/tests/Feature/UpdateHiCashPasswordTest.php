<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UpdateHiCashPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_password_change_invalidates_existing_sessions(): void
    {
        $user = User::factory()->create(['email' => 'owner@hicash.test']);
        DB::table('sessions')->insert([
            'id' => 'existing-session',
            'user_id' => $user->id,
            'payload' => 'stored',
            'last_activity' => time(),
        ]);

        $this->artisan('hicash:user:password')
            ->expectsQuestion('E-mail', 'owner@hicash.test')
            ->expectsQuestion('Nova senha', 'NewStrongPassword!123')
            ->expectsQuestion('Confirme a nova senha', 'NewStrongPassword!123')
            ->expectsOutput('Senha atualizada e sessões existentes encerradas.')
            ->assertSuccessful();

        $this->assertTrue(Hash::check('NewStrongPassword!123', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'existing-session']);
    }

    public function test_invalid_password_keeps_current_password_and_session(): void
    {
        $user = User::factory()->create(['email' => 'owner@hicash.test']);
        DB::table('sessions')->insert([
            'id' => 'existing-session',
            'user_id' => $user->id,
            'payload' => 'stored',
            'last_activity' => time(),
        ]);
        $oldHash = $user->password;

        $this->artisan('hicash:user:password')
            ->expectsQuestion('E-mail', 'owner@hicash.test')
            ->expectsQuestion('Nova senha', 'short')
            ->expectsQuestion('Confirme a nova senha', 'short')
            ->assertFailed();

        $this->assertSame($oldHash, $user->fresh()->password);
        $this->assertDatabaseHas('sessions', ['id' => 'existing-session']);
    }
}
