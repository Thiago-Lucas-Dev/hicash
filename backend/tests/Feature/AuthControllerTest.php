<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_for_unauthenticated_financial_request(): void
    {
        $this->getJson('/api/v1/accounts')->assertUnauthorized();
    }

    public function test_valid_credentials_create_authenticated_session(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ])->assertOk()->assertJsonPath('user.email', 'owner@hicash.test');

        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_credentials_return_422_without_authenticating(): void
    {
        User::factory()->create(['email' => 'owner@hicash.test']);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@hicash.test',
            'password' => 'incorrect',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_logout_invalidates_authenticated_session(): void
    {
        User::factory()->create([
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ])->assertOk();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Sessão encerrada.');

        $this->app['auth']->forgetGuards();
        $this->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/v1/auth/user')
            ->assertUnauthorized();
    }

    public function test_public_registration_endpoint_does_not_exist(): void
    {
        $this->postJson('/api/v1/auth/register')->assertNotFound();
    }

    public function test_create_user_command_refuses_a_second_user(): void
    {
        User::factory()->create();

        $this->artisan('hicash:user:create')
            ->expectsOutput('Já existe um usuário autorizado. Use hicash:user:password para alterar a senha.')
            ->assertFailed();
    }
}
