<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_and_chat_routes_require_login(): void
    {
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
        $this->getJson('/api/v1/chat/messages')->assertUnauthorized();
        $this->postJson('/api/v1/transactions', [])->assertUnauthorized();
        $this->postJson('/api/v1/recurrences/generate')->assertUnauthorized();
    }

    public function test_health_endpoints_are_public_and_ready_checks_the_database(): void
    {
        $this->get('/up')->assertOk();
        $this->getJson('/ready')->assertOk()->assertJsonPath('status', 'ok');
    }

    public function test_login_session_and_logout(): void
    {
        $user = User::factory()->create();

        $this->getJson('/api/v1/auth/csrf')->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.id', $user->id);
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('user.email', $user->email);
        $this->getJson('/api/v1/dashboard')->assertOk();
        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
    }

    public function test_invalid_password_and_public_registration_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'incorrect',
        ])->assertUnprocessable();
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Another',
            'email' => 'another@example.com',
            'password' => 'password',
        ])->assertNotFound();
        $this->assertDatabaseCount('users', 1);
    }

    public function test_initial_user_requires_an_interactive_terminal(): void
    {
        $this->artisan('hicash:create-user', ['--no-interaction' => true])->assertExitCode(1);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'incorrect',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'incorrect',
        ])->assertTooManyRequests();
    }

    public function test_login_requires_a_valid_csrf_token_outside_the_test_environment(): void
    {
        $user = User::factory()->create();
        $credentials = ['email' => $user->email, 'password' => 'password'];
        $this->app->instance('env', 'local');

        $this->postJson('/api/v1/auth/login', $credentials)->assertStatus(419);
        $token = $this->getJson('/api/v1/auth/csrf')->assertOk()->json('token');
        $this->withHeader('X-CSRF-TOKEN', $token)
            ->postJson('/api/v1/auth/login', $credentials)
            ->assertOk();
    }
}
