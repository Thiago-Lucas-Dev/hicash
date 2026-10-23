<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RecurrenceService
{
    public function generate(?string $through = null): int
    {
        $through ??= CarbonImmutable::now('America/Sao_Paulo')->toDateString();
        $created = 0;
        foreach (DB::table('recurrence_rules')->whereNull('deleted_at')->where('active',true)->get() as $rule) {
            DB::transaction(function () use ($rule,$through,&$created) {
                $locked = DB::table('recurrence_rules')->where('id',$rule->id)->lockForUpdate()->first();
                $date = CarbonImmutable::parse($locked->next_date);
                while ($date->toDateString() <= $through && (!$locked->end_date || $date->toDateString() <= $locked->end_date)) {
                    $inserted = DB::table('transactions')->insertOrIgnore([
                        'account_id'=>$locked->account_id,'category_id'=>$locked->category_id,'recurrence_rule_id'=>$locked->id,
                        'occurrence_date'=>$date->toDateString(),'type'=>$locked->type,'description'=>$locked->description,
                        'amount'=>$locked->amount,'reference_date'=>$date->toDateString(),'status'=>'pending',
                        'payment_method'=>$locked->payment_method,'origin'=>'recurrence','created_at'=>now(),'updated_at'=>now(),
                    ]);
                    $created += $inserted;
                    if ($inserted) {
                        $new = DB::table('transactions')->where('recurrence_rule_id',$locked->id)->where('occurrence_date',$date->toDateString())->first();
                        DB::table('audit_logs')->insert(['entity_type'=>'transactions','entity_id'=>$new->id,'action'=>'recurrence_created',
                            'after'=>json_encode($new),'created_at'=>now(),'updated_at'=>now()]);
                    }
                    $anchor = CarbonImmutable::parse($locked->start_date);
                    $date = match ($locked->frequency) {
                        'weekly'=>$date->addWeek(),
                        'yearly'=>$anchor->addYearsNoOverflow($date->year - $anchor->year + 1),
                        default=>$anchor->addMonthsNoOverflow(($date->year - $anchor->year) * 12 + $date->month - $anchor->month + 1),
                    };
                }
                DB::table('recurrence_rules')->where('id',$locked->id)->update(['next_date'=>$date->toDateString(),'updated_at'=>now()]);
            });
        }
        return $created;
    }
}
