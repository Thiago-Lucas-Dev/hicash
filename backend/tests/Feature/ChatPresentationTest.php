<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChatPresentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_transaction_summary_comes_from_persisted_record_and_history(): void
    {
        $this->actingAs(User::factory()->create());
        $accountId = DB::table('accounts')->insertGetId(['name' => 'Conta teste', 'opening_balance' => '0.00', 'created_at' => now(), 'updated_at' => now()]);
        $categoryId = DB::table('categories')->insertGetId(['name' => 'Alimentação teste', 'type' => 'expense', 'essential' => false, 'created_at' => now(), 'updated_at' => now()]);
        $commandId = (string) Str::uuid();
        $body = ['command_id' => $commandId, 'message' => '50 lanche', 'interpretation' => [
            'intent' => 'create_transactions', 'items' => [[
                'account_id' => $accountId, 'category_id' => $categoryId, 'type' => 'expense',
                'description' => 'Lanche', 'amount' => '50.00', 'reference_date' => '2026-10-28',
                'status' => 'completed', 'payment_method' => 'pix',
            ]],
        ]];

        $response = $this->postJson('/api/v1/chat/commands', $body);

        $response->assertOk()->assertJsonPath('presentation.kind', 'transactions_created')
            ->assertJsonPath('presentation.items.0.description', 'Lanche')
            ->assertJsonPath('presentation.items.0.account_name', 'Conta teste')
            ->assertJsonPath('presentation.items.0.category_name', 'Alimentação teste');
        $this->assertSame($response->json(), $this->postJson('/api/v1/chat/commands', $body)->json());
        $this->assertSame(1, DB::table('transactions')->count());
        $history = DB::table('chat_messages')->where('role', 'assistant')->first();
        $this->assertSame('transactions_created', json_decode($history->payload, true)['presentation']['kind']);
    }

    public function test_invalid_transaction_does_not_create_success_summary(): void
    {
        $this->actingAs(User::factory()->create());
        $response = $this->postJson('/api/v1/chat/commands', [
            'command_id' => (string) Str::uuid(), 'message' => '50 lanche',
            'interpretation' => ['intent' => 'create_transactions', 'items' => [[
                'account_id' => 999, 'category_id' => 999, 'type' => 'expense', 'description' => 'Lanche',
                'amount' => '50.00', 'reference_date' => '2026-10-28', 'status' => 'completed', 'payment_method' => 'pix',
            ]]],
        ]);

        $response->assertUnprocessable();
        $this->assertSame(0, DB::table('transactions')->count());
        $this->assertSame(0, DB::table('chat_messages')->count());
    }

    public function test_status_and_confirmed_deletion_include_the_saved_transaction(): void
    {
        $this->actingAs(User::factory()->create());
        $accountId = DB::table('accounts')->insertGetId(['name' => 'Banco teste', 'opening_balance' => '0.00', 'created_at' => now(), 'updated_at' => now()]);
        $categoryId = DB::table('categories')->insertGetId(['name' => 'Moradia teste', 'type' => 'expense', 'essential' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('transactions')->insert(['account_id' => $accountId, 'category_id' => $categoryId, 'type' => 'expense', 'description' => 'Aluguel teste', 'amount' => '900.00', 'reference_date' => '2026-10-28', 'status' => 'pending', 'payment_method' => 'pix', 'origin' => 'manual', 'created_at' => now(), 'updated_at' => now()]);

        $status = $this->postJson('/api/v1/chat/commands', ['command_id' => (string) Str::uuid(), 'message' => 'paguei aluguel teste', 'interpretation' => ['intent' => 'status_transaction', 'description' => 'Aluguel teste', 'status' => 'completed']]);
        $status->assertOk()->assertJsonPath('presentation.kind', 'transaction_status_updated')
            ->assertJsonPath('presentation.item.status', 'completed');

        $delete = $this->postJson('/api/v1/chat/commands', ['command_id' => (string) Str::uuid(), 'message' => 'excluir aluguel teste', 'interpretation' => ['intent' => 'delete_transaction', 'description' => 'Aluguel teste']]);
        $delete->assertOk()->assertJsonPath('confirm', true);
        $this->assertArrayNotHasKey('presentation', $delete->json());
        $confirmed = $this->postJson('/api/v1/chat/commands', ['command_id' => (string) Str::uuid(), 'message' => 'sim', 'interpretation' => ['intent' => 'confirm']]);
        $confirmed->assertOk()->assertJsonPath('presentation.kind', 'transaction_deleted')
            ->assertJsonPath('presentation.item.description', 'Aluguel teste');
        $this->assertNotNull(DB::table('transactions')->first()->deleted_at);
    }
}
