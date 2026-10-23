<?php

namespace App\Http\Controllers;

use App\Services\FinanceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChatController extends Controller
{
    public function messages()
    {
        return response()->json(['messages'=>DB::table('chat_messages')->orderBy('id')->get(),
            'state'=>DB::table('chat_state')->where('id',1)->first()]);
    }

    public function command(Request $request, FinanceService $finance)
    {
        $input = $request->validate(['command_id'=>'required|uuid','message'=>'required|string|max:2000',
            'interpretation'=>'required|array','interpretation.intent'=>'required|string']);
        return DB::transaction(function () use ($input,$finance) {
            $state = DB::table('chat_state')->where('id',1)->lockForUpdate()->first();
            if (!$state) { DB::table('chat_state')->insert(['id'=>1,'created_at'=>now(),'updated_at'=>now()]); $state = DB::table('chat_state')->where('id',1)->first(); }
            $existing = DB::table('processed_commands')->where('command_id',$input['command_id'])->first();
            if ($existing) return response()->json(json_decode($existing->response,true));
            DB::table('chat_messages')->insert(['role'=>'user','content'=>$input['message'],'created_at'=>now(),'updated_at'=>now()]);
            $pending = $state->pending ? json_decode($state->pending,true) : null;
            $interpretation = request()->input('interpretation');
            if ($pending && in_array($interpretation['intent'],['confirm','cancel','choose'])) {
                if ($interpretation['intent'] === 'cancel') {
                    $this->pending(null); $result = ['reply'=>'Operação cancelada.'];
                } elseif ($interpretation['intent'] === 'confirm') {
                    $this->pending(null);
                    $result = $pending['kind'] === 'delete' ? $this->deleteTransaction((int)$pending['id']) : ['reply'=>'Não há exclusão para confirmar.'];
                } else {
                    $choice = (int)($interpretation['id'] ?? 0);
                    $options = array_column($pending['options'],'id');
                    if (!in_array($choice,$options)) $result = ['reply'=>'Escolha uma das opções mostradas.','options'=>$pending['options']];
                    else { $this->pending(null); $result = $this->runTarget($pending['action'],$choice,$pending['data'] ?? []); }
                }
            } else {
                if ($pending) $this->pending(null);
                $result = $this->execute($interpretation,$finance);
            }
            $history = $state->context ? json_decode($state->context,true) : [];
            if (!array_is_list($history)) $history = [$history];
            $history[] = ['intent'=>$interpretation['intent'],'period'=>$interpretation['period'] ?? null,'at'=>now()->toIso8601String()];
            DB::table('chat_state')->where('id',1)->update(['context'=>json_encode(array_slice($history,-12)),'updated_at'=>now()]);
            DB::table('chat_messages')->insert(['role'=>'assistant','content'=>$result['reply'],'payload'=>json_encode($result),'created_at'=>now(),'updated_at'=>now()]);
            DB::table('processed_commands')->insert(['command_id'=>$input['command_id'],'response'=>json_encode($result),'created_at'=>now(),'updated_at'=>now()]);
            return response()->json($result);
        });
    }

    private function pending(?array $value): void
    {
        DB::table('chat_state')->where('id',1)->update(['pending'=>$value ? json_encode($value) : null,'updated_at'=>now()]);
    }
    private function clarify(array $cmd): array
    {
        if (!empty($cmd['draft'])) $this->pending(['kind'=>'draft','original'=>$cmd['draft']]);
        return ['reply'=>$cmd['question'] ?? 'Pode explicar melhor?'];
    }

    private function execute(array $cmd, FinanceService $finance): array
    {
        return match ($cmd['intent']) {
            'create_transactions'=>$this->createTransactions($cmd),
            'query_expenses'=>$this->queryExpenses($cmd,$finance),
            'query_balance'=>$this->queryBalance($cmd,$finance),
            'compare'=>$this->compare($cmd,$finance),
            'analyze'=>$this->analyze($cmd,$finance),
            'edit_transaction','delete_transaction','status_transaction'=>$this->resolveTarget($cmd),
            'undo'=>$this->undo(),
            'create_category'=>$this->createCategory($cmd),
            'learn_category'=>$this->learnCategory($cmd),
            'set_budget'=>$this->setBudget($cmd),
            'clarify'=>$this->clarify($cmd),
            default=>['reply'=>'Sou especializado em finanças pessoais. Posso registrar e consultar suas movimentações.'],
        };
    }

    private function transactionRules(): array
    {
        return ['account_id'=>['required',Rule::exists('accounts','id')->whereNull('deleted_at')],
            'category_id'=>['required',Rule::exists('categories','id')->whereNull('deleted_at')],
            'type'=>'required|in:income,expense','description'=>'required|string|max:255',
            'amount'=>'required|numeric|gt:0|decimal:0,2','reference_date'=>'required|date_format:Y-m-d',
            'status'=>'required|in:pending,completed','payment_method'=>'required|in:cash,debit,pix,bank_transfer,credit_card'];
    }

    private function createTransactions(array $cmd): array
    {
        $items = $cmd['items'] ?? [];
        if (!$items || count($items)>10) throw ValidationException::withMessages(['items'=>'Informe de 1 a 10 lançamentos.']);
        $valid = [];
        foreach ($items as $item) {
            $data = Validator::make($item,$this->transactionRules())->validate();
            if (DB::table('categories')->where('id',$data['category_id'])->value('type') !== $data['type'])
                throw ValidationException::withMessages(['category_id'=>'Categoria incompatível com o tipo do lançamento.']);
            $valid[] = $data;
        }
        foreach ($valid as $data) {
            $id = DB::table('transactions')->insertGetId([...$data,'origin'=>'chatbot','created_at'=>now(),'updated_at'=>now()]);
            $this->audit($id,'chat_created',null,DB::table('transactions')->where('id',$id)->first());
        }
        return ['reply'=>count($valid)===1 ? 'Lançamento registrado.' : count($valid).' lançamentos registrados.', 'cards'=>$valid];
    }

    private function period(array $cmd): array
    {
        $start = $cmd['start'] ?? CarbonImmutable::now('America/Sao_Paulo')->startOfMonth()->toDateString();
        $end = $cmd['end'] ?? CarbonImmutable::now('America/Sao_Paulo')->endOfMonth()->toDateString();
        Validator::make(['start'=>$start,'end'=>$end],['start'=>'required|date_format:Y-m-d','end'=>'required|date_format:Y-m-d|after_or_equal:start'])->validate();
        return [$start,$end];
    }
    private function queryExpenses(array $cmd, FinanceService $finance): array
    {
        [$start,$end]=$this->period($cmd); $report=$finance->report($start,$end);
        return ['reply'=>'Despesas no período: R$ '.number_format((float)$report['totals']['expense'],2,',','.').'.',
            'cards'=>['totals'=>$report['totals'],'categories'=>$report['categories']]];
    }
    private function queryBalance(array $cmd, FinanceService $finance): array
    {
        [, $end]=$this->period($cmd); $balances=$finance->balances($end);
        if (!empty($cmd['account_id'])) $balances=array_values(array_filter($balances,fn($a)=>$a['id']==$cmd['account_id']));
        $total='0.00'; foreach ($balances as $a) $total=bcadd($total,$a['effective'],2);
        return ['reply'=>'Saldo efetivo: R$ '.number_format((float)$total,2,',','.').'.','cards'=>$balances];
    }
    private function compare(array $cmd, FinanceService $finance): array
    {
        [$start,$end]=$this->period($cmd); $current=$finance->report($start,$end)['totals']['expense'];
        $prior=CarbonImmutable::parse($start)->subMonthNoOverflow();
        $previous=$finance->report($prior->startOfMonth()->toDateString(),$prior->endOfMonth()->toDateString())['totals']['expense'];
        $diff=bcsub($current,$previous,2);
        return ['reply'=>$diff==='0.00' ? 'Você gastou o mesmo que no mês anterior.' :
            ($diff[0]==='-' ? 'Você gastou R$ '.number_format(abs((float)$diff),2,',','.').' a menos que no mês anterior.' :
                'Você gastou R$ '.number_format((float)$diff,2,',','.').' a mais que no mês anterior.'),
            'cards'=>['current'=>$current,'previous'=>$previous]];
    }
    private function analyze(array $cmd, FinanceService $finance): array
    {
        [$start,$end]=$this->period($cmd); $report=$finance->report($start,$end);
        $categories=$report['categories']; usort($categories,fn($a,$b)=>(float)$b['completed']<=>(float)$a['completed']);
        $top=$categories[0] ?? null;
        return ['reply'=>$top ? 'Seu maior gasto no período foi '.$top['name'].' (R$ '.number_format((float)$top['completed'],2,',','.').'). Revise essa categoria para procurar economia.' :
            'Ainda não há despesas no período para analisar.','cards'=>$categories];
    }

    private function resolveTarget(array $cmd): array
    {
        $description=trim((string)($cmd['description'] ?? ''));
        if (!$description) return ['reply'=>'Qual lançamento você quer alterar?'];
        $matches=DB::table('transactions')->whereNull('deleted_at')->where('description','like','%'.$description.'%')
            ->orderByDesc('reference_date')->orderByDesc('id')->limit(5)->get();
        if (!$matches->count()) return ['reply'=>'Não encontrei esse lançamento.'];
        $action=$cmd['intent']; $data=['amount'=>$cmd['amount'] ?? null,'status'=>$cmd['status'] ?? null];
        if ($matches->count()>1 && empty($cmd['latest'])) {
            $options=$matches->map(fn($m)=>['id'=>$m->id,'label'=>"#{$m->id} {$m->description} — R$ {$m->amount} ({$m->reference_date})"])->all();
            $this->pending(['kind'=>'choose','action'=>$action,'data'=>$data,'options'=>$options]);
            return ['reply'=>'Encontrei mais de um lançamento. Qual deles?','options'=>$options];
        }
        return $this->runTarget($action,$matches->first()->id,$data);
    }
    private function runTarget(string $action, int $id, array $data): array
    {
        if ($action==='delete_transaction') {
            $this->pending(['kind'=>'delete','id'=>$id]);
            return ['reply'=>'Confirma a exclusão do lançamento #'.$id.'?','confirm'=>true];
        }
        $before=DB::table('transactions')->where('id',$id)->whereNull('deleted_at')->firstOrFail();
        if ($action==='edit_transaction') {
            $valid=Validator::make($data,['amount'=>'required|numeric|gt:0|decimal:0,2'])->validate();
            DB::table('transactions')->where('id',$id)->update(['amount'=>$valid['amount'],'updated_at'=>now()]);
            $verb='Valor corrigido';
        } else {
            $valid=Validator::make($data,['status'=>'required|in:pending,completed'])->validate();
            DB::table('transactions')->where('id',$id)->update(['status'=>$valid['status'],'updated_at'=>now()]);
            $verb='Status atualizado';
        }
        $this->audit($id,'chat_updated',$before,DB::table('transactions')->where('id',$id)->first());
        return ['reply'=>$verb.' no lançamento #'.$id.'.'];
    }
    private function deleteTransaction(int $id): array
    {
        $before=DB::table('transactions')->where('id',$id)->whereNull('deleted_at')->firstOrFail();
        DB::table('transactions')->where('id',$id)->update(['deleted_at'=>now(),'updated_at'=>now()]);
        $this->audit($id,'chat_deleted',$before,null);
        return ['reply'=>'Lançamento #'.$id.' excluído.'];
    }
    private function undo(): array
    {
        $audit=DB::table('audit_logs')->where('entity_type','transactions')->whereIn('action',['chat_created','chat_updated','chat_deleted'])
            ->whereNotIn('id',DB::table('audit_logs')->where('action','chat_undone')->whereNotNull('source_audit_id')->select('source_audit_id'))
            ->orderByDesc('id')->first();
        if (!$audit) return ['reply'=>'Não há movimentação recente elegível para desfazer.'];
        $before=$audit->before ? json_decode($audit->before,true) : null;
        if ($audit->action==='chat_created') DB::table('transactions')->where('id',$audit->entity_id)->update(['deleted_at'=>now(),'updated_at'=>now()]);
        elseif ($before) DB::table('transactions')->where('id',$audit->entity_id)->update([...$before,'updated_at'=>now()]);
        DB::table('audit_logs')->insert(['entity_type'=>'transactions','entity_id'=>$audit->entity_id,'action'=>'chat_undone',
            'source_audit_id'=>$audit->id,'before'=>$audit->after,'after'=>$audit->before,'created_at'=>now(),'updated_at'=>now()]);
        return ['reply'=>'Última movimentação desfeita.'];
    }
    private function createCategory(array $cmd): array
    {
        $data=Validator::make($cmd,['name'=>'required|string|max:120','type'=>'required|in:income,expense'])->validate();
        $exists=DB::table('categories')->where('name',$data['name'])->where('type',$data['type'])->whereNull('deleted_at')->first();
        if ($exists) return ['reply'=>'Essa categoria já existe.'];
        $id=DB::table('categories')->insertGetId([...$data,'essential'=>false,'created_at'=>now(),'updated_at'=>now()]);
        DB::table('audit_logs')->insert(['entity_type'=>'categories','entity_id'=>$id,'action'=>'chat_created',
            'after'=>json_encode(DB::table('categories')->where('id',$id)->first()),'created_at'=>now(),'updated_at'=>now()]);
        return ['reply'=>'Categoria criada.','cards'=>['id'=>$id,...$data]];
    }
    private function learnCategory(array $cmd): array
    {
        $data=Validator::make($cmd,['keyword'=>'required|string|max:120','category_id'=>['required',Rule::exists('categories','id')->whereNull('deleted_at')]])->validate();
        $keyword=mb_strtolower(trim($data['keyword']),'UTF-8');
        DB::table('category_aliases')->updateOrInsert(['keyword'=>$keyword],['category_id'=>$data['category_id'],'created_at'=>now(),'updated_at'=>now()]);
        return ['reply'=>'Vou associar “'.$keyword.'” a essa categoria nos próximos lançamentos.'];
    }
    private function setBudget(array $cmd): array
    {
        $data=Validator::make($cmd,['category_id'=>'required|exists:categories,id','year'=>'required|integer|between:2000,2100',
            'month'=>'required|integer|between:1,12','amount'=>'required|numeric|gt:0|decimal:0,2'])->validate();
        if (DB::table('categories')->where('id',$data['category_id'])->value('type') !== 'expense')
            throw ValidationException::withMessages(['category_id'=>'Orçamentos exigem categoria de despesa.']);
        $key=['category_id'=>$data['category_id'],'year'=>$data['year'],'month'=>$data['month']];
        $before=DB::table('category_budgets')->where($key)->first();
        DB::table('category_budgets')->updateOrInsert($key,
            ['amount'=>$data['amount'],'alert_percent'=>$before->alert_percent ?? 80,'updated_at'=>now(),'created_at'=>$before->created_at ?? now()]);
        $after=DB::table('category_budgets')->where($key)->first();
        DB::table('audit_logs')->insert(['entity_type'=>'category_budgets','entity_id'=>$after->id,'action'=>$before?'chat_updated':'chat_created',
            'before'=>$before?json_encode($before):null,'after'=>json_encode($after),'created_at'=>now(),'updated_at'=>now()]);
        return ['reply'=>'Limite mensal atualizado.'];
    }
    private function audit(int $id,string $action,$before,$after): void
    {
        DB::table('audit_logs')->insert(['entity_type'=>'transactions','entity_id'=>$id,'action'=>$action,
            'before'=>$before ? json_encode($before) : null,'after'=>$after ? json_encode($after) : null,'created_at'=>now(),'updated_at'=>now()]);
    }
}
