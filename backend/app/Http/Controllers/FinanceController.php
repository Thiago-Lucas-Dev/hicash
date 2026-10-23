<?php

namespace App\Http\Controllers;

use App\Services\FinanceService;
use App\Services\RecurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinanceController extends Controller
{
    private const TABLES = ['accounts'=>'accounts','categories'=>'categories','transactions'=>'transactions',
        'transfers'=>'transfers','budgets'=>'category_budgets','recurrences'=>'recurrence_rules'];

    public function index(Request $request)
    {
        $resource = $request->route('resource'); $table = self::TABLES[$resource];
        $query = DB::table($table);
        if (in_array($resource,['accounts','categories','transactions','transfers','recurrences'])) $query->whereNull('deleted_at');
        if ($resource === 'transactions') {
            foreach (['type','status','account_id','category_id','payment_method'] as $field) if ($request->filled($field)) $query->where($field,$request->input($field));
            if ($request->filled('start')) $query->where('reference_date','>=',$request->input('start'));
            if ($request->filled('end')) $query->where('reference_date','<=',$request->input('end'));
            $query->orderByDesc('reference_date')->orderByDesc('id');
        } else $query->orderByDesc('id');
        if ($resource === 'budgets') {
            if ($request->filled('year')) $query->where('year',$request->integer('year'));
            if ($request->filled('month')) $query->where('month',$request->integer('month'));
        }
        return response()->json($query->get());
    }

    private function rules(string $resource, ?int $id = null): array
    {
        $money = ['required','numeric','gt:0','decimal:0,2','max:9999999999999'];
        $account = ['required',Rule::exists('accounts','id')->whereNull('deleted_at')];
        $category = ['required',Rule::exists('categories','id')->whereNull('deleted_at')];
        return match ($resource) {
            'accounts'=>['name'=>'required|string|max:120','opening_balance'=>'required|numeric|decimal:0,2'],
            'categories'=>['name'=>['required','string','max:120',Rule::unique('categories')->where(fn($q)=>$q->where('type',request('type')))->ignore($id)],
                'type'=>'required|in:income,expense','essential'=>'required|boolean'],
            'transactions'=>['account_id'=>$account,'category_id'=>$category,'type'=>'required|in:income,expense',
                'description'=>'required|string|max:255','amount'=>$money,'reference_date'=>'required|date_format:Y-m-d',
                'status'=>'required|in:pending,completed','payment_method'=>'required|in:cash,debit,pix,bank_transfer,credit_card',
                'note'=>'nullable|string|max:2000'],
            'transfers'=>['from_account_id'=>$account,'to_account_id'=>['required','different:from_account_id',Rule::exists('accounts','id')->whereNull('deleted_at')],
                'amount'=>$money,'reference_date'=>'required|date_format:Y-m-d','note'=>'nullable|string|max:2000'],
            'budgets'=>['category_id'=>$category,'year'=>'required|integer|between:2000,2100','month'=>'required|integer|between:1,12',
                'amount'=>$money,'alert_percent'=>'required|integer|between:1,100'],
            'recurrences'=>['account_id'=>$account,'category_id'=>$category,'type'=>'required|in:income,expense',
                'description'=>'required|string|max:255','amount'=>$money,'payment_method'=>'required|in:cash,debit,pix,bank_transfer,credit_card',
                'frequency'=>'required|in:weekly,monthly,yearly','start_date'=>'required|date_format:Y-m-d',
                'end_date'=>'nullable|date_format:Y-m-d|after_or_equal:start_date','active'=>'required|boolean'],
        };
    }

    private function checkCategory(array $data): void
    {
        if (!isset($data['category_id'],$data['type'])) return;
        if (DB::table('categories')->where('id',$data['category_id'])->value('type') !== $data['type'])
            throw ValidationException::withMessages(['category_id'=>'A categoria deve ter o mesmo tipo do lançamento.']);
    }

    private function audit(string $table, int $id, string $action, $before, $after): void
    {
        DB::table('audit_logs')->insert(['entity_type'=>$table,'entity_id'=>$id,'action'=>$action,
            'before'=>$before ? json_encode($before) : null,'after'=>$after ? json_encode($after) : null,
            'created_at'=>now(),'updated_at'=>now()]);
    }

    public function store(Request $request)
    {
        $resource = $request->route('resource'); $table = self::TABLES[$resource];
        $data = $request->validate($this->rules($resource)); $this->checkCategory($data);
        if ($resource === 'budgets' && DB::table('categories')->where('id',$data['category_id'])->value('type') !== 'expense')
            throw ValidationException::withMessages(['category_id'=>'Orçamentos exigem categoria de despesa.']);
        if ($resource === 'budgets' && DB::table($table)->where('category_id',$data['category_id'])->where('year',$data['year'])->where('month',$data['month'])->exists())
            throw ValidationException::withMessages(['category_id'=>'Já existe orçamento para esta categoria e mês.']);
        if ($resource === 'recurrences') $data['next_date'] = $data['start_date'];
        if ($resource === 'transactions') $data['origin'] = 'manual';
        return DB::transaction(function () use ($table,$data) {
            $id = DB::table($table)->insertGetId([...$data,'created_at'=>now(),'updated_at'=>now()]);
            $item = DB::table($table)->where('id',$id)->first(); $this->audit($table,$id,'created',null,$item);
            return response()->json($item,201);
        });
    }

    public function update(Request $request, int $id)
    {
        $resource = $request->route('resource'); $table = self::TABLES[$resource];
        $before = DB::table($table)->where('id',$id)->when(in_array($resource,['accounts','categories','transactions','transfers','recurrences']),fn($q)=>$q->whereNull('deleted_at'))->firstOrFail();
        $data = $request->validate($this->rules($resource,$id)); $this->checkCategory($data);
        if ($resource === 'budgets' && DB::table('categories')->where('id',$data['category_id'])->value('type') !== 'expense')
            throw ValidationException::withMessages(['category_id'=>'Orçamentos exigem categoria de despesa.']);
        if ($resource === 'recurrences') $data['next_date'] = max($before->next_date,$data['start_date']);
        if ($resource === 'transactions') unset($data['origin']);
        return DB::transaction(function () use ($table,$id,$before,$data) {
            DB::table($table)->where('id',$id)->update([...$data,'updated_at'=>now()]);
            $after = DB::table($table)->where('id',$id)->first(); $this->audit($table,$id,'updated',$before,$after);
            return response()->json($after);
        });
    }

    public function destroy(Request $request, int $id)
    {
        $resource = $request->route('resource'); $table = self::TABLES[$resource];
        $before = DB::table($table)->where('id',$id)->firstOrFail();
        if (in_array($resource,['accounts','categories'])) {
            $column = $resource === 'accounts' ? 'account_id' : 'category_id';
            if (DB::table('transactions')->where($column,$id)->whereNull('deleted_at')->exists())
                throw ValidationException::withMessages(['id'=>'Há movimentações nesta conta ou categoria.']);
            if (DB::table('recurrence_rules')->where($column,$id)->whereNull('deleted_at')->exists())
                throw ValidationException::withMessages(['id'=>'Há recorrências nesta conta ou categoria.']);
            if ($resource === 'accounts' && DB::table('transfers')->whereNull('deleted_at')->where(fn($q)=>$q->where('from_account_id',$id)->orWhere('to_account_id',$id))->exists())
                throw ValidationException::withMessages(['id'=>'Há transferências nesta conta.']);
        }
        DB::transaction(function () use ($resource,$table,$id,$before) {
            if ($resource === 'budgets') DB::table($table)->where('id',$id)->delete();
            else DB::table($table)->where('id',$id)->update(['deleted_at'=>now(),'updated_at'=>now()]);
            $this->audit($table,$id,'deleted',$before,null);
        });
        return response()->noContent();
    }

    public function status(Request $request, int $id)
    {
        $data = $request->validate(['status'=>'required|in:pending,completed']);
        $before = DB::table('transactions')->where('id',$id)->whereNull('deleted_at')->firstOrFail();
        DB::transaction(function () use ($id,$before,$data) {
            DB::table('transactions')->where('id',$id)->update(['status'=>$data['status'],'updated_at'=>now()]);
            $this->audit('transactions',$id,'status',$before,DB::table('transactions')->where('id',$id)->first());
        });
        return response()->json(DB::table('transactions')->where('id',$id)->first());
    }

    public function reports(Request $request, FinanceService $service)
    {
        [$start,$end] = $this->period($request);
        return response()->json($service->report($start,$end));
    }
    public function dashboard(Request $request, FinanceService $service)
    {
        [$start,$end] = $this->period($request);
        return response()->json($service->dashboard($start,$end));
    }
    private function period(Request $request): array
    {
        $request->validate(['start'=>'sometimes|date_format:Y-m-d','end'=>'sometimes|date_format:Y-m-d|after_or_equal:start']);
        $today = CarbonImmutable::now('America/Sao_Paulo');
        return [$request->input('start',$today->startOfMonth()->toDateString()),$request->input('end',$today->endOfMonth()->toDateString())];
    }

    public function aliases() { return response()->json(DB::table('category_aliases')->orderBy('keyword')->get()); }
    public function storeAlias(Request $request)
    {
        $data = $request->validate(['keyword'=>'required|string|max:120|unique:category_aliases,keyword','category_id'=>'required|exists:categories,id']);
        $id = DB::table('category_aliases')->insertGetId([...$data,'created_at'=>now(),'updated_at'=>now()]);
        return response()->json(DB::table('category_aliases')->where('id',$id)->first(),201);
    }
    public function destroyAlias(int $id) { DB::table('category_aliases')->where('id',$id)->delete(); return response()->noContent(); }

    public function settings()
    {
        return response()->json(DB::table('settings')->pluck('value','key')->map(fn($v)=>json_decode($v,true)));
    }
    public function saveSettings(Request $request)
    {
        $data = $request->validate(['default_account_id'=>'nullable|exists:accounts,id',
            'default_payment_method'=>'required|in:cash,debit,pix,bank_transfer,credit_card','theme'=>'required|in:light,dark']);
        foreach ($data as $key=>$value) DB::table('settings')->updateOrInsert(['key'=>$key],['value'=>json_encode($value),'created_at'=>now(),'updated_at'=>now()]);
        return $this->settings();
    }

    public function generateRecurrences(RecurrenceService $service) { return response()->json(['created'=>$service->generate()]); }
    public function updateFutureRecurrence(Request $request, int $id)
    {
        $rule = DB::table('recurrence_rules')->where('id',$id)->whereNull('deleted_at')->firstOrFail();
        $data = $request->validate($this->rules('recurrences',$id)); $this->checkCategory($data);
        $effective = $request->validate(['effective_date'=>'required|date_format:Y-m-d'])['effective_date'];
        if (!empty($data['end_date']) && $data['end_date'] < $effective)
            throw ValidationException::withMessages(['end_date'=>'O fim deve ser posterior ao início da nova regra.']);
        DB::transaction(function () use ($id,$rule,$data,$effective) {
            DB::table('recurrence_rules')->where('id',$id)->update(['end_date'=>CarbonImmutable::parse($effective)->subDay()->toDateString(),'updated_at'=>now()]);
            DB::table('transactions')->where('recurrence_rule_id',$id)->where('reference_date','>=',$effective)
                ->where('status','pending')->whereNull('deleted_at')->update(['deleted_at'=>now(),'updated_at'=>now()]);
            $newId = DB::table('recurrence_rules')->insertGetId([...$data,'start_date'=>$effective,'next_date'=>$effective,'created_at'=>now(),'updated_at'=>now()]);
            $this->audit('recurrence_rules',$id,'future_updated',$rule,DB::table('recurrence_rules')->where('id',$id)->first());
            $this->audit('recurrence_rules',$newId,'created',null,DB::table('recurrence_rules')->where('id',$newId)->first());
        });
        return response()->json(['message'=>'Regra futura criada.']);
    }
}
