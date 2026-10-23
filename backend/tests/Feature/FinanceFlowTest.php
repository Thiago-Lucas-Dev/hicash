<?php

namespace Tests\Feature;

use App\Services\FinanceService;
use App\Services\RecurrenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class FinanceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function account(string $name, string $opening): int
    {
        return $this->postJson('/api/v1/accounts',['name'=>$name,'opening_balance'=>$opening])->assertCreated()->json('id');
    }
    private function category(string $name, string $type='expense'): int
    {
        return DB::table('categories')->where('name',$name)->where('type',$type)->value('id');
    }
    private function transaction(int $account, int $category, string $amount, string $status='completed', string $payment='pix'): array
    {
        return ['account_id'=>$account,'category_id'=>$category,'type'=>'expense','description'=>'Mercado','amount'=>$amount,
            'reference_date'=>'2026-10-15','status'=>$status,'payment_method'=>$payment];
    }

    public function test_balances_transfer_credit_and_pending_are_distinct(): void
    {
        $a=$this->account('Banco','1000.00'); $b=$this->account('Carteira','100.00'); $cat=$this->category('Alimentação');
        $this->postJson('/api/v1/transactions',$this->transaction($a,$cat,'100.00'))->assertCreated();
        $this->postJson('/api/v1/transactions',$this->transaction($a,$cat,'50.00','pending'))->assertCreated();
        $this->postJson('/api/v1/transactions',$this->transaction($a,$cat,'75.00','completed','credit_card'))->assertCreated();
        $this->postJson('/api/v1/transfers',['from_account_id'=>$a,'to_account_id'=>$b,'amount'=>'200.00','reference_date'=>'2026-10-15'])->assertCreated();
        $balances=app(FinanceService::class)->balances('2026-10-31');
        $this->assertEquals('700.00',$balances[0]['effective']);
        $this->assertEquals('650.00',$balances[0]['projected']);
        $this->assertEquals('300.00',$balances[1]['effective']);
        $report=app(FinanceService::class)->report('2026-10-01','2026-10-31');
        $this->assertEquals('175.00',$report['totals']['expense']);
        $this->assertEquals('50.00',$report['totals']['pending_expense']);
    }

    public function test_chat_batch_is_atomic_and_idempotent(): void
    {
        $account=$this->account('Banco','0.00'); $category=$this->category('Alimentação');
        $valid=$this->transaction($account,$category,'50.00');
        $bad=$this->transaction($account,99999,'30.00');
        $id=(string)Str::uuid();
        $this->postJson('/api/v1/chat/commands',['command_id'=>$id,'message'=>'50 lanche e 30 erro',
            'interpretation'=>['intent'=>'create_transactions','items'=>[$valid,$bad]]])->assertUnprocessable();
        $this->assertDatabaseCount('transactions',0);
        $payload=['command_id'=>$id,'message'=>'50 lanche','interpretation'=>['intent'=>'create_transactions','items'=>[$valid]]];
        $this->postJson('/api/v1/chat/commands',$payload)->assertOk();
        $this->postJson('/api/v1/chat/commands',$payload)->assertOk();
        $this->assertDatabaseCount('transactions',1);
        $this->postJson('/api/v1/chat/commands',['command_id'=>(string)Str::uuid(),'message'=>'desfaz isso','interpretation'=>['intent'=>'undo']])->assertOk();
        $this->assertNotNull(DB::table('transactions')->first()->deleted_at);
    }

    public function test_recurrences_catch_up_without_duplicates(): void
    {
        $account=$this->account('Banco','0.00'); $category=$this->category('Moradia');
        $this->postJson('/api/v1/recurrences',['account_id'=>$account,'category_id'=>$category,'type'=>'expense',
            'description'=>'Aluguel','amount'=>'900.00','payment_method'=>'pix','frequency'=>'monthly',
            'start_date'=>'2026-01-31','active'=>true])->assertCreated();
        $service=app(RecurrenceService::class);
        $this->assertEquals(3,$service->generate('2026-03-31'));
        $this->assertEquals(0,$service->generate('2026-03-31'));
        $this->assertEquals(['2026-01-31','2026-02-28','2026-03-31'],DB::table('transactions')->orderBy('reference_date')->pluck('reference_date')->all());
        $this->assertEquals(3,DB::table('transactions')->where('status','pending')->count());
    }

    public function test_chat_deletion_requires_confirmation_and_alias_is_persisted(): void
    {
        $account=$this->account('Banco','0.00'); $category=$this->category('Alimentação');
        $this->postJson('/api/v1/transactions',$this->transaction($account,$category,'25.00'))->assertCreated();
        $send=fn(string $message,array $interpretation)=>$this->postJson('/api/v1/chat/commands',[
            'command_id'=>(string)Str::uuid(),'message'=>$message,'interpretation'=>$interpretation]);
        $send('apaga mercado',['intent'=>'delete_transaction','description'=>'Mercado','latest'=>true])->assertOk()->assertJsonPath('confirm',true);
        $this->assertNull(DB::table('transactions')->first()->deleted_at);
        $send('cancelar',['intent'=>'cancel'])->assertOk();
        $this->assertNull(DB::table('transactions')->first()->deleted_at);
        $send('associa feira a Alimentação',['intent'=>'learn_category','keyword'=>'feira','category_id'=>$category])->assertOk();
        $this->assertDatabaseHas('category_aliases',['keyword'=>'feira','category_id'=>$category]);
        $send('apaga mercado',['intent'=>'delete_transaction','description'=>'Mercado','latest'=>true])->assertOk();
        $send('sim',['intent'=>'confirm'])->assertOk();
        $this->assertNotNull(DB::table('transactions')->first()->deleted_at);
    }

    public function test_budget_threshold_uses_completed_and_pending(): void
    {
        $account=$this->account('Banco','0.00'); $category=$this->category('Alimentação');
        $this->postJson('/api/v1/budgets',['category_id'=>$category,'year'=>2026,'month'=>10,'amount'=>'100.00','alert_percent'=>80])->assertCreated();
        $this->postJson('/api/v1/transactions',$this->transaction($account,$category,'60.00'))->assertCreated();
        $this->postJson('/api/v1/transactions',$this->transaction($account,$category,'25.00','pending'))->assertCreated();
        $budget=app(FinanceService::class)->budgets(2026,10)[0];
        $this->assertEquals('60.00',$budget['used']);
        $this->assertEquals('25.00',$budget['committed']);
        $this->assertTrue($budget['alert']);
    }

    public function test_future_recurrence_edit_replaces_pending_occurrences(): void
    {
        $account=$this->account('Banco','0.00'); $category=$this->category('Moradia');
        $original=['account_id'=>$account,'category_id'=>$category,'type'=>'expense','description'=>'Aluguel',
            'amount'=>'900.00','payment_method'=>'pix','frequency'=>'monthly','start_date'=>'2026-01-01',
            'end_date'=>null,'active'=>true];
        $id=$this->postJson('/api/v1/recurrences',$original)->assertCreated()->json('id');
        app(RecurrenceService::class)->generate('2026-04-01');
        $this->postJson("/api/v1/recurrences/$id/future",[...$original,'amount'=>'1000.00','effective_date'=>'2026-03-01'])->assertOk();
        $this->assertEquals(2,app(RecurrenceService::class)->generate('2026-04-01'));
        $visible=DB::table('transactions')->whereNull('deleted_at')->orderBy('reference_date')->pluck('amount')->all();
        $this->assertEquals(['900','900','1000','1000'],$visible);
        $this->assertEquals('2026-02-28',DB::table('recurrence_rules')->where('id',$id)->value('end_date'));
    }
}
