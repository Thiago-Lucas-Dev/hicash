<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_routes_require_login(): void
    {
        $this->getJson('/api/v1/accounts')->assertUnauthorized();
    }

    public function test_login_creates_session_and_me_returns_only_public_user_data(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ]);

        $this->getJson('/api/v1/auth/csrf')->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@hicash.test',
            'password' => 'StrongPassword!123',
        ])->assertOk()->assertJsonPath('user.email', 'owner@hicash.test');

        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertExactJson(['user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => 'owner@hicash.test',
            ]]);
    }

    public function test_invalid_credentials_do_not_authenticate(): void
    {
        User::factory()->create(['email' => 'owner@hicash.test']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@hicash.test',
            'password' => 'incorrect',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_logout_ends_session(): void
    {
        $this->actingAs(User::factory()->create());

        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertGuest();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_registration_endpoint_is_not_exposed(): void
    {
        $this->postJson('/api/v1/auth/register')->assertNotFound();
    }
}
