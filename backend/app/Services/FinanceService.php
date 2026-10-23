<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class FinanceService
{
    public function balances(string $through): array
    {
        $accounts = DB::table('accounts')->whereNull('deleted_at')->get();
        $transactions = DB::table('transactions')->whereNull('deleted_at')->where('reference_date', '<=', $through)->where('payment_method', '!=', 'credit_card')->get();
        $transfers = DB::table('transfers')->whereNull('deleted_at')->where('reference_date', '<=', $through)->get();
        return $accounts->map(function ($account) use ($transactions, $transfers) {
            $effective = (string) $account->opening_balance;
            $pending = '0.00';
            foreach ($transactions->where('account_id', $account->id) as $transaction) {
                $signed = $transaction->type === 'income' ? (string) $transaction->amount : bcmul((string) $transaction->amount, '-1', 2);
                if ($transaction->status === 'completed') $effective = bcadd($effective, $signed, 2);
                else $pending = bcadd($pending, $signed, 2);
            }
            foreach ($transfers as $transfer) {
                if ($transfer->from_account_id === $account->id) $effective = bcsub($effective, (string) $transfer->amount, 2);
                if ($transfer->to_account_id === $account->id) $effective = bcadd($effective, (string) $transfer->amount, 2);
            }
            return ['id'=>$account->id, 'name'=>$account->name, 'effective'=>$effective, 'projected'=>bcadd($effective,$pending,2)];
        })->all();
    }

    public function report(string $start, string $end): array
    {
        $rows = DB::table('transactions as t')->join('categories as c','c.id','=','t.category_id')
            ->whereNull('t.deleted_at')->whereBetween('t.reference_date',[$start,$end])
            ->select('t.*','c.name as category_name')->orderByDesc('t.reference_date')->orderByDesc('t.id')->get();
        $totals = ['income'=>'0.00','expense'=>'0.00','pending_income'=>'0.00','pending_expense'=>'0.00'];
        $categories = [];
        $months = [];
        foreach ($rows as $row) {
            $key = ($row->status === 'pending' ? 'pending_' : '').$row->type;
            $totals[$key] = bcadd($totals[$key], (string)$row->amount, 2);
            if ($row->type === 'expense') {
                $name = $row->category_name;
                $categories[$name] ??= ['name'=>$name,'completed'=>'0.00','pending'=>'0.00'];
                $categories[$name][$row->status] = bcadd($categories[$name][$row->status],(string)$row->amount,2);
            }
            $month = substr($row->reference_date,0,7);
            $months[$month] ??= ['month'=>$month,'income'=>'0.00','expense'=>'0.00'];
            if ($row->status === 'completed') $months[$month][$row->type] = bcadd($months[$month][$row->type],(string)$row->amount,2);
        }
        return ['start'=>$start,'end'=>$end,'totals'=>$totals,'categories'=>array_values($categories),'months'=>array_values($months),'recent'=>$rows->take(8)->all()];
    }

    public function budgets(int $year, int $month): array
    {
        $items = DB::table('category_budgets as b')->join('categories as c','c.id','=','b.category_id')
            ->where('b.year',$year)->where('b.month',$month)->whereNull('c.deleted_at')
            ->select('b.*','c.name as category_name')->get();
        return $items->map(function ($item) use ($year,$month) {
            $rows = DB::table('transactions')->whereNull('deleted_at')->where('category_id',$item->category_id)
                ->whereYear('reference_date',$year)->whereMonth('reference_date',$month)->where('type','expense')
                ->selectRaw('status, SUM(amount) as total')->groupBy('status')->pluck('total','status');
            $used = bcadd('0.00',(string)($rows['completed'] ?? '0.00'),2);
            $committed = bcadd('0.00',(string)($rows['pending'] ?? '0.00'),2);
            $ratio = (float)$item->amount > 0 ? (float)bcdiv(bcadd($used,$committed,2),(string)$item->amount,4)*100 : 0;
            return [...(array)$item,'used'=>$used,'committed'=>$committed,'percent'=>round($ratio,1),'alert'=>$ratio >= $item->alert_percent];
        })->all();
    }

    public function dashboard(string $start, string $end): array
    {
        $report = $this->report($start,$end);
        $balances = $this->balances($end);
        $balanceTotals=['effective'=>'0.00','projected'=>'0.00'];
        foreach ($balances as $balance) {
            $balanceTotals['effective']=bcadd($balanceTotals['effective'],$balance['effective'],2);
            $balanceTotals['projected']=bcadd($balanceTotals['projected'],$balance['projected'],2);
        }
        $previousMonth = CarbonImmutable::parse($start)->subMonthNoOverflow();
        $previousStart = $previousMonth->startOfMonth()->toDateString();
        $previousEnd = $previousMonth->endOfMonth()->toDateString();
        $previous = $this->report($previousStart,$previousEnd);
        $trend=[]; $month=CarbonImmutable::parse($start)->startOfMonth();
        for ($i=5;$i>=0;$i--) {
            $date=$month->subMonthsNoOverflow($i);
            $totals=$this->report($date->toDateString(),$date->endOfMonth()->toDateString())['totals'];
            $trend[]=['month'=>$date->format('Y-m'),'income'=>$totals['income'],'expense'=>$totals['expense']];
        }
        return [...$report,'trend'=>$trend,'balances'=>$balances,'balance_totals'=>$balanceTotals,'budgets'=>$this->budgets((int)substr($start,0,4),(int)substr($start,5,2)),
            'previous'=>$previous['totals']];
    }
}
