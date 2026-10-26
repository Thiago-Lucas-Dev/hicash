<?php

namespace Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GenerateRecurrencesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_command_creates_due_pending_occurrences_without_duplicates(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-03-31 12:00:00', 'America/Sao_Paulo'));
        $accountId = DB::table('accounts')->insertGetId([
            'name' => 'Banco',
            'opening_balance' => '0.00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $categoryId = DB::table('categories')->where('name', 'Moradia')->value('id');
        DB::table('recurrence_rules')->insert([
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'type' => 'expense',
            'description' => 'Aluguel',
            'amount' => '900.00',
            'payment_method' => 'pix',
            'frequency' => 'monthly',
            'start_date' => '2026-01-31',
            'next_date' => '2026-01-31',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('hicash:recurrences')
            ->expectsOutput('Recorrências geradas: 3')
            ->assertSuccessful();
        $this->artisan('hicash:recurrences')
            ->expectsOutput('Recorrências geradas: 0')
            ->assertSuccessful();

        $this->assertSame(3, DB::table('transactions')->where('status', 'pending')->count());
    }
}
